import { logger } from '../utils/logger';
import { textParsingService } from './textParsingService';
import { fileService } from './fileService';
import { FileRecord } from '../models/File';

export interface ProcessingJob {
  fileId: string;
  s3Key: string;
  contentType: string;
  originalName: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

class TextExtractionProcessor {
  private processingQueue: ProcessingJob[] = [];
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL_MS = 5000; // 5 seconds
  private readonly MAX_CONCURRENT_JOBS = 3;
  private readonly MAX_RETRIES = 3;
  private activeJobs: Set<string> = new Set();

  constructor() {
    this.startProcessing();
  }

  /**
   * Add file to processing queue
   */
  public async queueFile(
    fileId: string,
    s3Key: string,
    contentType: string,
    originalName: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    // Check if file is already in queue or being processed
    if (this.activeJobs.has(fileId) || this.processingQueue.some(job => job.fileId === fileId)) {
      logger.debug(`📄 File already in processing queue: ${fileId}`);
      return;
    }

    // Check if text extraction is applicable
    if (!textParsingService.isTextExtractable(contentType, originalName)) {
      logger.debug(`📄 File not suitable for text extraction: ${originalName} (${contentType})`);
      
      // Update status to not_applicable
      await fileService.updateExtractionStatus(fileId, 'not_applicable');
      return;
    }

    const job: ProcessingJob = {
      fileId,
      s3Key,
      contentType,
      originalName,
      priority,
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
      createdAt: new Date()
    };

    // Insert job based on priority
    if (priority === 'high') {
      this.processingQueue.unshift(job);
    } else {
      this.processingQueue.push(job);
    }

    logger.info(`📋 File queued for text extraction: ${originalName} (priority: ${priority})`);
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return; // Already started
    }

    logger.info('🔄 Starting text extraction background processor');

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.PROCESSING_INTERVAL_MS);

    // Also process immediately
    this.processQueue();
  }

  /**
   * Stop background processing
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('⏹️ Text extraction background processor stopped');
    }
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
      return; // Too many concurrent jobs
    }

    this.isProcessing = true;

    try {
      // Process multiple jobs concurrently
      const jobsToProcess = this.processingQueue.splice(0, this.MAX_CONCURRENT_JOBS - this.activeJobs.size);
      
      if (jobsToProcess.length > 0) {
        logger.debug(`🔄 Processing ${jobsToProcess.length} text extraction jobs`);
        
        const processingPromises = jobsToProcess.map(job => this.processJob(job));
        await Promise.allSettled(processingPromises);
      }
    } catch (error) {
      logger.error('❌ Error in queue processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: ProcessingJob): Promise<void> {
    this.activeJobs.add(job.fileId);

    try {
      logger.info(`📄 Starting text extraction: ${job.originalName} (attempt ${job.retryCount + 1}/${job.maxRetries + 1})`);

      // Update status to processing
      await fileService.updateExtractionStatus(job.fileId, 'processing');

      // Extract text
      const result = await textParsingService.extractText(
        job.s3Key,
        job.contentType,
        job.originalName
      );

      if (result.success && result.text) {
        // Update file with extracted text
        await fileService.updateExtractionStatus(
          job.fileId,
          'completed',
          result.text,
          undefined,
          result.metadata
        );

        logger.info(`✅ Text extraction completed: ${job.originalName} (${result.text.length} characters)`);
      } else {
        throw new Error(result.error || 'Text extraction failed');
      }

    } catch (error: any) {
      logger.error(`❌ Text extraction failed for ${job.originalName}:`, error);

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        
        // Add back to queue with delay (exponential backoff)
        setTimeout(() => {
          this.processingQueue.push(job);
          logger.info(`🔄 Retrying text extraction: ${job.originalName} (attempt ${job.retryCount + 1}/${job.maxRetries + 1})`);
        }, Math.pow(2, job.retryCount) * 1000); // 2s, 4s, 8s delays
      } else {
        // Max retries reached, mark as failed
        await fileService.updateExtractionStatus(
          job.fileId,
          'failed',
          undefined,
          error.message
        );

        logger.error(`💥 Text extraction failed permanently: ${job.originalName} - ${error.message}`);
      }
    } finally {
      this.activeJobs.delete(job.fileId);
    }
  }

  /**
   * Process pending files from database
   */
  public async processPendingFiles(): Promise<void> {
    try {
      logger.info('🔍 Checking for pending text extraction files...');
      
      const pendingFiles = await fileService.getPendingExtractionFiles();
      
      if (pendingFiles.length > 0) {
        logger.info(`📋 Found ${pendingFiles.length} files pending text extraction`);
        
        for (const file of pendingFiles) {
          await this.queueFile(
            file.id,
            file.s3_key,
            file.content_type,
            file.original_name,
            'normal'
          );
        }
      } else {
        logger.debug('✅ No files pending text extraction');
      }
    } catch (error) {
      logger.error('❌ Error processing pending files:', error);
    }
  }

  /**
   * Get queue status
   */
  public getStatus(): {
    queueLength: number;
    activeJobs: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear queue (for testing/debugging)
   */
  public clearQueue(): void {
    this.processingQueue = [];
    logger.info('🗑️ Text extraction queue cleared');
  }

  /**
   * Force process a specific file immediately
   */
  public async processFileImmediately(
    fileId: string,
    s3Key: string,
    contentType: string,
    originalName: string
  ): Promise<boolean> {
    try {
      logger.info(`⚡ Force processing text extraction: ${originalName}`);

      const job: ProcessingJob = {
        fileId,
        s3Key,
        contentType,
        originalName,
        priority: 'high',
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        createdAt: new Date()
      };

      await this.processJob(job);
      return true;
    } catch (error) {
      logger.error(`❌ Force processing failed for ${originalName}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const textExtractionProcessor = new TextExtractionProcessor();
export default textExtractionProcessor; 