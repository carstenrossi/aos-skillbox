import { s3Service } from './s3Service';
import { getFileModel, FileRecord, CreateFileData } from '../models/File';
import { getDatabase } from '../database/database';
import { logger } from '../utils/logger';
import mime from 'mime-types';
import path from 'path';

export interface UploadFileData {
  originalName: string;
  buffer: Buffer;
  contentType?: string;
  uploadedBy: string;
  metadata?: any;
}

export interface FileUploadResult {
  file: FileRecord;
  s3Key: string;
  s3Url: string;
  publicUrl: string;
}

class FileService {
  private fileModel: any = null;

  /**
   * Initialize file service with database
   */
  public initialize(): void {
    const database = getDatabase();
    if (database.instance) {
      this.fileModel = getFileModel(database);
      logger.info('📁 File Service initialized');
    } else {
      logger.error('🚨 File Service: Database not available');
    }
  }

  /**
   * Determine file category based on content type
   */
  private determineFileCategory(contentType: string, originalName: string): 'text' | 'binary' {
    const textTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const extension = path.extname(originalName).toLowerCase();
    const textExtensions = ['.txt', '.md', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];

    return textTypes.includes(contentType) || textExtensions.includes(extension) ? 'text' : 'binary';
  }

  /**
   * Upload file to S3 and create database record
   */
  async uploadFile(data: UploadFileData): Promise<FileUploadResult> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    if (!s3Service.isInitialized()) {
      throw new Error('S3 Service not configured');
    }

    try {
      // Determine content type
      const contentType = data.contentType || mime.lookup(data.originalName) || 'application/octet-stream';
      
      // Determine file category
      const fileCategory = this.determineFileCategory(contentType, data.originalName);
      
      logger.info(`📤 Uploading file: ${data.originalName} (${fileCategory}, ${data.buffer.length} bytes)`);

      // Upload to S3
      const uploadResult = await s3Service.uploadFile(
        data.buffer,
        data.originalName,
        contentType
      );

      // Create database record
      const fileData: CreateFileData = {
        original_name: data.originalName,
        s3_key: uploadResult.key,
        s3_url: uploadResult.url,
        file_size: data.buffer.length,
        content_type: contentType,
        file_category: fileCategory,
        uploaded_by: data.uploadedBy,
        metadata: data.metadata
      };

      const fileRecord = await this.fileModel.create(fileData);

      logger.info(`✅ File uploaded successfully: ${fileRecord.id} -> ${uploadResult.key}`);

      return {
        file: fileRecord,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
        publicUrl: uploadResult.url
      };

    } catch (error) {
      logger.error('🚨 File upload failed:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<FileRecord | null> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.findById(fileId);
  }

  /**
   * Get files by user
   */
  async getUserFiles(userId: string, limit: number = 50, offset: number = 0): Promise<FileRecord[]> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.findByUser(userId, limit, offset);
  }

  /**
   * Get files by category
   */
  async getFilesByCategory(category: 'text' | 'binary', limit: number = 50, offset: number = 0): Promise<FileRecord[]> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.findByCategory(category, limit, offset);
  }

  /**
   * Delete file (soft delete + S3 cleanup)
   */
  async deleteFile(fileId: string, deletedBy: string): Promise<boolean> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    try {
      // Get file record
      const file = await this.fileModel.findById(fileId);
      if (!file) {
        logger.warn(`🚨 File not found for deletion: ${fileId}`);
        return false;
      }

      // Soft delete in database
      const deleted = await this.fileModel.delete(fileId);
      
      if (deleted) {
        // Delete from S3 (async, don't wait)
        s3Service.deleteFile(file.s3_key).catch(error => {
          logger.error(`🚨 Failed to delete file from S3: ${file.s3_key}`, error);
        });

        logger.info(`🗑️ File deleted: ${fileId} by ${deletedBy}`);
      }

      return deleted;
    } catch (error) {
      logger.error('🚨 File deletion failed:', error);
      throw error;
    }
  }

  /**
   * Attach file to conversation
   */
  async attachFileToConversation(
    conversationId: string,
    fileId: string,
    attachedBy: string,
    context?: string
  ): Promise<boolean> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    try {
      await this.fileModel.attachToConversation(conversationId, fileId, attachedBy, context);
      logger.info(`🔗 File attached to conversation: ${fileId} -> ${conversationId}`);
      return true;
    } catch (error) {
      // Handle duplicate attachment gracefully
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        logger.warn(`⚠️ File already attached to conversation: ${fileId} -> ${conversationId}`);
        return true; // Consider it successful
      }
      logger.error('🚨 Failed to attach file to conversation:', error);
      throw error;
    }
  }

  /**
   * Get files attached to conversation
   */
  async getConversationFiles(conversationId: string): Promise<FileRecord[]> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    const files = await this.fileModel.getConversationFiles(conversationId);
    return files.map(f => ({
      id: f.id,
      original_name: f.original_name,
      s3_key: f.s3_key,
      s3_url: f.s3_url,
      file_size: f.file_size,
      content_type: f.content_type,
      file_category: f.file_category,
      uploaded_by: f.uploaded_by,
      upload_timestamp: f.upload_timestamp,
      extracted_text: f.extracted_text,
      extraction_status: f.extraction_status,
      extraction_error: f.extraction_error,
      extraction_timestamp: f.extraction_timestamp,
      metadata: f.metadata,
      is_active: f.is_active,
      created_at: f.created_at,
      updated_at: f.updated_at
    }));
  }

  /**
   * Detach file from conversation
   */
  async detachFileFromConversation(conversationId: string, fileId: string): Promise<boolean> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.detachFromConversation(conversationId, fileId);
  }

  /**
   * Get file statistics
   */
  async getFileStats(): Promise<{
    total: number;
    by_category: { text: number; binary: number };
    by_extraction_status: Record<string, number>;
    total_size: number;
  }> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.getStats();
  }

  /**
   * Generate signed URL for file download
   */
  async getFileDownloadUrl(fileId: string, expiresIn: number = 3600): Promise<string | null> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    const file = await this.fileModel.findById(fileId);
    if (!file) {
      return null;
    }

    return s3Service.getSignedUrl(file.s3_key, expiresIn);
  }

  /**
   * Get files pending text extraction
   */
  async getPendingExtractionFiles(): Promise<FileRecord[]> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.findPendingExtraction();
  }

  /**
   * Update extraction status and text
   */
  async updateExtractionStatus(
    fileId: string,
    status: 'processing' | 'completed' | 'failed' | 'not_applicable',
    extractedText?: string,
    error?: string,
    metadata?: any
  ): Promise<boolean> {
    if (!this.fileModel) {
      throw new Error('File Service not initialized');
    }

    return this.fileModel.updateExtraction(fileId, status, extractedText, error);
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.fileModel !== null && s3Service.isInitialized();
  }
}

// Singleton instance
export const fileService = new FileService(); 