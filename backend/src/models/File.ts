import { Database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface FileRecord {
  id: string;
  original_name: string;
  s3_key: string;
  s3_url: string;
  file_size: number;
  content_type: string;
  file_category: 'text' | 'binary';
  uploaded_by: string;
  upload_timestamp: string;
  
  // Text extraction fields
  extracted_text?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  extraction_error?: string;
  extraction_timestamp?: string;
  
  // Metadata
  metadata?: string; // JSON string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFileData {
  original_name: string;
  s3_key: string;
  s3_url: string;
  file_size: number;
  content_type: string;
  file_category: 'text' | 'binary';
  uploaded_by: string;
  metadata?: any; // Will be JSON stringified
}

export interface ConversationFile {
  id: number;
  conversation_id: string;
  file_id: string;
  attached_by: string;
  attachment_timestamp: string;
  attachment_context?: string;
  is_active: boolean;
}

export class FileModel {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Create a new file record
   */
  async create(data: CreateFileData): Promise<FileRecord> {
    const fileId = uuidv4();
    const now = new Date().toISOString();
    
    // Determine extraction status based on file category
    const extractionStatus = data.file_category === 'text' ? 'pending' : 'not_applicable';
    
    const sql = `
      INSERT INTO files (
        id, original_name, s3_key, s3_url, file_size, content_type, 
        file_category, uploaded_by, upload_timestamp, extraction_status,
        metadata, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      fileId,
      data.original_name,
      data.s3_key,
      data.s3_url,
      data.file_size,
      data.content_type,
      data.file_category,
      data.uploaded_by,
      now,
      extractionStatus,
      data.metadata ? JSON.stringify(data.metadata) : null,
      1, // is_active
      now,
      now
    ];

    await this.db.run(sql, params);
    
    logger.info(`📄 File record created: ${fileId} (${data.original_name})`);
    
    const createdFile = await this.findById(fileId);
    if (!createdFile) {
      throw new Error(`Failed to create file record: ${fileId}`);
    }
    return createdFile;
  }

  /**
   * Find file by ID
   */
  async findById(id: string): Promise<FileRecord | null> {
    const sql = 'SELECT * FROM files WHERE id = ? AND is_active = 1';
    const result = await this.db.get<FileRecord>(sql, [id]);
    return result || null;
  }

  /**
   * Find file by S3 key
   */
  async findByS3Key(s3Key: string): Promise<FileRecord | null> {
    const sql = 'SELECT * FROM files WHERE s3_key = ? AND is_active = 1';
    const result = await this.db.get<FileRecord>(sql, [s3Key]);
    return result || null;
  }

  /**
   * Get files by user
   */
  async findByUser(userId: string, limit: number = 50, offset: number = 0): Promise<FileRecord[]> {
    const sql = `
      SELECT * FROM files 
      WHERE uploaded_by = ? AND is_active = 1 
      ORDER BY upload_timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    return this.db.all<FileRecord>(sql, [userId, limit, offset]);
  }

  /**
   * Get files by category
   */
  async findByCategory(category: 'text' | 'binary', limit: number = 50, offset: number = 0): Promise<FileRecord[]> {
    const sql = `
      SELECT * FROM files 
      WHERE file_category = ? AND is_active = 1 
      ORDER BY upload_timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    return this.db.all<FileRecord>(sql, [category, limit, offset]);
  }

  /**
   * Get files pending text extraction
   */
  async findPendingExtraction(): Promise<FileRecord[]> {
    const sql = `
      SELECT * FROM files 
      WHERE extraction_status = 'pending' AND file_category = 'text' AND is_active = 1 
      ORDER BY upload_timestamp ASC
    `;
    return this.db.all<FileRecord>(sql);
  }

  /**
   * Update extraction status and text
   */
  async updateExtraction(
    fileId: string, 
    status: 'processing' | 'completed' | 'failed',
    extractedText?: string,
    error?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    
    const sql = `
      UPDATE files 
      SET extraction_status = ?, extracted_text = ?, extraction_error = ?, 
          extraction_timestamp = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const params = [status, extractedText || null, error || null, now, now, fileId];
    const result = await this.db.run(sql, params);
    
    logger.info(`📝 File extraction updated: ${fileId} -> ${status}`);
    return result.changes > 0;
  }

  /**
   * Attach file to conversation
   */
  async attachToConversation(
    conversationId: string,
    fileId: string,
    attachedBy: string,
    context?: string
  ): Promise<ConversationFile> {
    const now = new Date().toISOString();
    
    const sql = `
      INSERT INTO conversation_files (
        conversation_id, file_id, attached_by, attachment_timestamp, 
        attachment_context, is_active
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [conversationId, fileId, attachedBy, now, context || null, 1];
    const result = await this.db.run(sql, params);
    
    logger.info(`🔗 File attached to conversation: ${fileId} -> ${conversationId}`);
    
    // Return the created record
    const getResult = await this.db.get<ConversationFile>(
      'SELECT * FROM conversation_files WHERE rowid = ?',
      [result.lastID]
    );
    
    return getResult!;
  }

  /**
   * Get files attached to conversation
   */
  async getConversationFiles(conversationId: string): Promise<(FileRecord & ConversationFile)[]> {
    const sql = `
      SELECT f.*, cf.id as attachment_id, cf.attached_by, cf.attachment_timestamp, 
             cf.attachment_context, cf.is_active as attachment_active
      FROM files f
      INNER JOIN conversation_files cf ON f.id = cf.file_id
      WHERE cf.conversation_id = ? AND cf.is_active = 1 AND f.is_active = 1
      ORDER BY cf.attachment_timestamp DESC
    `;
    
    return this.db.all<FileRecord & ConversationFile>(sql, [conversationId]);
  }

  /**
   * Remove file from conversation
   */
  async detachFromConversation(conversationId: string, fileId: string): Promise<boolean> {
    const sql = `
      UPDATE conversation_files 
      SET is_active = 0 
      WHERE conversation_id = ? AND file_id = ?
    `;
    
    const result = await this.db.run(sql, [conversationId, fileId]);
    
    if (result.changes > 0) {
      logger.info(`🔗 File detached from conversation: ${fileId} -> ${conversationId}`);
    }
    
    return result.changes > 0;
  }

  /**
   * Soft delete file
   */
  async delete(fileId: string): Promise<boolean> {
    const now = new Date().toISOString();
    
    const sql = 'UPDATE files SET is_active = 0, updated_at = ? WHERE id = ?';
    const result = await this.db.run(sql, [now, fileId]);
    
    if (result.changes > 0) {
      logger.info(`🗑️ File soft deleted: ${fileId}`);
    }
    
    return result.changes > 0;
  }

  /**
   * Get file statistics
   */
  async getStats(): Promise<{
    total: number;
    by_category: { text: number; binary: number };
    by_extraction_status: Record<string, number>;
    total_size: number;
  }> {
    const [totalResult, categoryResult, extractionResult, sizeResult] = await Promise.all([
      this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM files WHERE is_active = 1'),
      this.db.all<{ file_category: string; count: number }>(`
        SELECT file_category, COUNT(*) as count 
        FROM files WHERE is_active = 1 
        GROUP BY file_category
      `),
      this.db.all<{ extraction_status: string; count: number }>(`
        SELECT extraction_status, COUNT(*) as count 
        FROM files WHERE is_active = 1 
        GROUP BY extraction_status
      `),
      this.db.get<{ total_size: number }>('SELECT SUM(file_size) as total_size FROM files WHERE is_active = 1')
    ]);

    const byCategoryMap = { text: 0, binary: 0 };
    categoryResult.forEach(row => {
      byCategoryMap[row.file_category as 'text' | 'binary'] = row.count;
    });

    const byExtractionMap: Record<string, number> = {};
    extractionResult.forEach(row => {
      byExtractionMap[row.extraction_status] = row.count;
    });

    return {
      total: totalResult?.count || 0,
      by_category: byCategoryMap,
      by_extraction_status: byExtractionMap,
      total_size: sizeResult?.total_size || 0
    };
  }
}

// Singleton instance
let fileModel: FileModel | null = null;

export const getFileModel = (database?: Database): FileModel => {
  if (!fileModel && database) {
    fileModel = new FileModel(database);
  }
  if (!fileModel) {
    throw new Error('FileModel not initialized. Please provide a database instance.');
  }
  return fileModel;
}; 