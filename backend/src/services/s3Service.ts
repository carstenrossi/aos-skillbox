import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import config from '../config';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { settingsService } from './settingsService';

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlPrefix: string;
}

class S3Service {
  private client: S3Client | null = null;
  private currentConfig: S3Config | null = null;
  private isLoadingFromDatabase: boolean = false;

  /**
   * Initialize S3 Client with configuration
   */
  public initialize(s3Config: S3Config): void {
    try {
      this.client = new S3Client({
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      });
      
      this.currentConfig = s3Config;
      logger.info('🗄️ S3 Service initialized successfully');
    } catch (error) {
      logger.error('🚨 Failed to initialize S3 Service:', error);
      // Don't throw error to prevent server crash
      this.client = null;
      this.currentConfig = null;
    }
  }

  /**
   * Load S3 configuration from database
   */
  public async loadFromDatabase(): Promise<boolean> {
    if (this.isLoadingFromDatabase) {
      return false; // Prevent recursive loading
    }

    this.isLoadingFromDatabase = true;
    
    try {
      logger.info('🔄 S3 Service: Loading configuration from database...');
      const s3Config = await settingsService.getS3Config();
      
      if (s3Config.accessKeyId && s3Config.secretAccessKey && s3Config.region && s3Config.bucket) {
        this.initialize({
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          region: s3Config.region,
          bucket: s3Config.bucket,
          publicUrlPrefix: s3Config.publicUrlPrefix || `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com`
        });
        
        logger.info('✅ S3 Service: Configuration loaded from database successfully');
        return true;
      } else {
        logger.info('💡 S3 Service: No complete configuration found in database');
        return false;
      }
    } catch (error) {
      logger.error('🚨 S3 Service: Failed to load configuration from database:', error);
      return false;
    } finally {
      this.isLoadingFromDatabase = false;
    }
  }

  /**
   * Save S3 configuration to database and initialize
   */
  public async saveAndInitialize(s3Config: S3Config): Promise<boolean> {
    try {
      // Save to database first
      const saved = await settingsService.setS3Config(s3Config);
      
      if (saved) {
        // Then initialize the service
        this.initialize(s3Config);
        logger.info('✅ S3 Service: Configuration saved and initialized successfully');
        return true;
      } else {
        logger.error('🚨 S3 Service: Failed to save configuration to database');
        return false;
      }
    } catch (error) {
      logger.error('🚨 S3 Service: Failed to save and initialize configuration:', error);
      return false;
    }
  }

  /**
   * Check if S3 is properly configured and accessible
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client || !this.currentConfig) {
      logger.warn('⚠️ S3 Service not initialized');
      return false;
    }

    try {
      // Use ListObjectsV2 to test bucket access - this is safer than HeadObject
      const command = new ListObjectsV2Command({
        Bucket: this.currentConfig.bucket,
        MaxKeys: 1, // Only get 1 object to minimize data transfer
      });

      const response = await this.client.send(command);
      logger.info('✅ S3 Connection test successful - bucket accessible');
      return true;
    } catch (error: any) {
      logger.error('🚨 S3 Connection test failed:', {
        name: error.name,
        message: error.message,
        code: error.Code,
        statusCode: error.$metadata?.httpStatusCode,
        bucket: this.currentConfig.bucket,
        region: this.currentConfig.region
      });
      return false;
    }
  }

  /**
   * Generate unique file key with naming convention
   * Format: skillbox-YYYY-MM-DD-originalname-uuid.ext
   */
  public generateFileKey(originalName: string, userId?: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileExt = originalName.split('.').pop() || '';
    const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    const uuid = uuidv4().split('-')[0]; // Short UUID
    
    // Sanitize filename (remove special characters)
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    return `skillbox-${timestamp}-${sanitizedBaseName}-${uuid}.${fileExt}`;
  }

  /**
   * Upload file to S3
   */
  public async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    userId?: string
  ): Promise<S3UploadResult> {
    if (!this.client || !this.currentConfig) {
      throw new Error('S3 Service not initialized');
    }

    const key = this.generateFileKey(originalName, userId);
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.currentConfig.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          originalName: originalName,
          uploadedBy: userId || 'unknown',
          uploadTimestamp: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      const publicUrl = `${this.currentConfig.publicUrlPrefix}/${key}`;

      logger.info(`📤 File uploaded successfully: ${key}`);

      return {
        key,
        url: publicUrl,
        bucket: this.currentConfig.bucket,
        size: buffer.length,
        contentType,
      };
    } catch (error) {
      logger.error('🚨 Failed to upload file to S3:', error);
      throw new Error('File upload failed');
    }
  }

  /**
   * Download file from S3
   */
  public async downloadFile(key: string): Promise<Buffer> {
    if (!this.client || !this.currentConfig) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.currentConfig.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content received');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('🚨 Failed to download file from S3:', error);
      throw new Error('File download failed');
    }
  }

  /**
   * Generate presigned URL for secure file access
   */
  public async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client || !this.currentConfig) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.currentConfig.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('🚨 Failed to generate signed URL:', error);
      throw new Error('Signed URL generation failed');
    }
  }

  /**
   * Delete file from S3
   */
  public async deleteFile(key: string): Promise<void> {
    if (!this.client || !this.currentConfig) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.currentConfig.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info(`🗑️ File deleted successfully: ${key}`);
    } catch (error) {
      logger.error('🚨 Failed to delete file from S3:', error);
      throw new Error('File deletion failed');
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): S3Config | null {
    return this.currentConfig;
  }

  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.client !== null && this.currentConfig !== null;
  }
}

// Export singleton instance
export const s3Service = new S3Service();

// Initialize with default config if available
const initializeWithDefaults = async () => {
  // First try environment variables
  if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
    s3Service.initialize({
      region: config.AWS_REGION,
      bucket: config.AWS_S3_BUCKET,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      publicUrlPrefix: config.S3_PUBLIC_URL_PREFIX,
    });
    logger.info('🗄️ S3 Service: Initialized from environment variables');
  } else {
    // Try to load from database after a short delay to ensure database is ready
    logger.info('💡 S3 Service: Will try to load from database after initialization');
  }
};

// Auto-initialize if config is available
initializeWithDefaults(); 