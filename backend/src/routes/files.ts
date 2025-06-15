import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateTokenStandard } from '../middleware/auth';
import { fileService } from '../services/fileService';
import { textExtractionProcessor } from '../services/textExtractionProcessor';
import { JWTPayload } from '../types';
import { logger } from '../utils/logger';

const router = express.Router();

// Type guard to check if request has authenticated user
const isAuthenticated = (req: Request): req is Request & { user: JWTPayload } => {
  return 'user' in req && req.user !== undefined;
};

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  },
});

/**
 * POST /api/files/upload
 * Upload a file to S3 and optionally attach to conversation
 */
router.post('/upload', authenticateTokenStandard, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { message: 'No file provided', code: 'NO_FILE' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!fileService.isReady()) {
      res.status(503).json({
        success: false,
        error: { message: 'File service not ready. Please check S3 configuration.', code: 'SERVICE_NOT_READY' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { conversationId } = req.body;

    logger.info(`📁 File upload started: ${req.file.originalname} (${req.file.size} bytes) by user ${req.user.userId}`);

    // Upload file using file service
    const uploadResult = await fileService.uploadFile({
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      uploadedBy: req.user.userId,
      metadata: {
        uploadedVia: 'api',
        userAgent: req.get('user-agent'),
        ip: req.ip
      }
    });

    // Attach to conversation if provided
    if (conversationId) {
      await fileService.attachFileToConversation(
        conversationId,
        uploadResult.file.id,
        req.user.userId,
        'upload'
      );
      logger.info(`🔗 File ${uploadResult.file.id} attached to conversation ${conversationId}`);
    }

    // Queue file for text extraction if applicable
    if (uploadResult.file.file_category === 'text') {
      await textExtractionProcessor.queueFile(
        uploadResult.file.id,
        uploadResult.s3Key,
        uploadResult.file.content_type,
        uploadResult.file.original_name,
        'normal'
      );
      logger.info(`📋 File queued for text extraction: ${uploadResult.file.id}`);
    }

    logger.info(`✅ File upload completed: ${uploadResult.file.id}`);

    res.json({
      success: true,
      data: {
        id: uploadResult.file.id,
        originalName: uploadResult.file.original_name,
        s3Key: uploadResult.s3Key,
        s3Url: uploadResult.s3Url,
        fileSize: uploadResult.file.file_size,
        contentType: uploadResult.file.content_type,
        fileCategory: uploadResult.file.file_category,
        createdAt: uploadResult.file.upload_timestamp,
        attachedToConversation: !!conversationId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('❌ File upload failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'File upload failed',
        code: 'UPLOAD_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/files/stats
 * Get file statistics for user
 */
router.get('/stats', authenticateTokenStandard, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const stats = await fileService.getFileStats();

    // Format bytes for better readability
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    res.json({
      success: true,
      data: {
        totalFiles: stats.total,
        totalSize: stats.total_size,
        totalSizeFormatted: formatBytes(stats.total_size),
        byCategory: stats.by_category,
        byExtractionStatus: stats.by_extraction_status
      },
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error: any) {
    logger.error('❌ Failed to get file stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve file statistics',
        code: 'STATS_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * GET /api/files
 * List user's files with pagination and filtering
 */
router.get('/', authenticateTokenStandard, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;

    let files;
    if (category && (category === 'text' || category === 'binary')) {
      files = await fileService.getFilesByCategory(category, limit, offset);
    } else {
      files = await fileService.getUserFiles(req.user.userId, limit, offset);
    }

    const filesData = files.map(file => ({
      id: file.id,
      originalName: file.original_name,
      fileSize: file.file_size,
      contentType: file.content_type,
      fileCategory: file.file_category,
      uploadTimestamp: file.upload_timestamp,
      extractionStatus: file.extraction_status,
      hasExtractedText: !!file.extracted_text
    }));

    res.json({
      success: true,
      data: {
        files: filesData,
        pagination: {
          limit,
          offset,
          hasMore: files.length === limit
        }
      },
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error: any) {
    logger.error('❌ Failed to list files:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve files',
        code: 'LIST_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * GET /api/files/:id
 * Get file details
 */
router.get('/:id', authenticateTokenStandard, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const fileId = req.params.id;
    const file = await fileService.getFile(fileId);

    if (!file) {
      res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'FILE_NOT_FOUND' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check ownership
    if (file.uploaded_by !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'ACCESS_DENIED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        originalName: file.original_name,
        fileSize: file.file_size,
        contentType: file.content_type,
        fileCategory: file.file_category,
        uploadTimestamp: file.upload_timestamp,
        extractionStatus: file.extraction_status,
        extractedText: file.extracted_text,
        extractionError: file.extraction_error,
        extractionTimestamp: file.extraction_timestamp,
        metadata: file.metadata ? JSON.parse(file.metadata) : null
      },
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error: any) {
    logger.error('❌ Failed to get file:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve file',
        code: 'GET_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * GET /api/files/:id/download
 * Generate signed download URL
 */
router.get('/:id/download', authenticateTokenStandard, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const fileId = req.params.id;
    const expiresIn = Math.min(parseInt(req.query.expires as string) || 3600, 86400); // Max 24 hours

    const file = await fileService.getFile(fileId);

    if (!file) {
      res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'FILE_NOT_FOUND' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check ownership
    if (file.uploaded_by !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'ACCESS_DENIED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const downloadUrl = await fileService.getFileDownloadUrl(fileId, expiresIn);

    if (!downloadUrl) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to generate download URL', code: 'DOWNLOAD_ERROR' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      },
      timestamp: new Date().toISOString()
    });
    return;

  } catch (error: any) {
    logger.error('❌ Failed to generate download URL:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate download URL',
        code: 'DOWNLOAD_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
});

/**
 * DELETE /api/files/:id
 * Delete file (soft delete)
 */
router.delete('/:id', authenticateTokenStandard, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required', code: 'NOT_AUTHENTICATED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const fileId = req.params.id;
    const file = await fileService.getFile(fileId);

    if (!file) {
      res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'FILE_NOT_FOUND' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check ownership
    if (file.uploaded_by !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: { message: 'Access denied', code: 'ACCESS_DENIED' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const deleted = await fileService.deleteFile(fileId, req.user.userId);

    if (deleted) {
      logger.info(`🗑️ File deleted: ${fileId} by user ${req.user.userId}`);
      
      res.json({
        success: true,
        data: { message: 'File deleted successfully' },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to delete file', code: 'DELETE_ERROR' },
        timestamp: new Date().toISOString()
      });
    }
    return;

  } catch (error: any) {
    logger.error('❌ Failed to delete file:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete file',
        code: 'DELETE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
});

export default router; 