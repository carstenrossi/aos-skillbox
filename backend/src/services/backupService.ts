import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/database';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  interval: number; // in hours
  retentionDays: number;
  maxBackups: number;
  backupPath: string;
  compressionEnabled: boolean;
}

export interface BackupInfo {
  id: string;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: Date;
  type: 'automatic' | 'manual';
  compressed: boolean;
}

export class BackupService {
  private config: BackupConfig;
  private backupTimer?: NodeJS.Timeout;
  private isBackupInProgress = false;

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupDirectory();
  }

  /**
   * Initialize backup service with automatic scheduling
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('📁 Backup service disabled');
      return;
    }

    console.log(`📁 Backup service initialized - Every ${this.config.interval}h, Keep ${this.config.retentionDays} days`);
    
    // Schedule automatic backups
    this.scheduleAutomaticBackups();
    
    // Clean up old backups on startup
    await this.cleanupOldBackups();
  }

  /**
   * Create a manual backup
   */
  async createBackup(type: 'automatic' | 'manual' = 'manual'): Promise<BackupInfo> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.isBackupInProgress = true;
    console.log(`📁 Starting ${type} backup...`);

    try {
      const database = getDatabase();
      if (!database.instance) {
        throw new Error('Database not initialized');
      }

      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0];
      const backupId = `backup_${timestamp}_${type}`;
      const fileName = `${backupId}.db`;
      const filePath = path.join(this.config.backupPath, fileName);

      // Create SQLite backup using .backup command
      await this.createSQLiteBackup(database.instance, filePath);

      // Compress if enabled
      let finalPath = filePath;
      let compressed = false;
      if (this.config.compressionEnabled) {
        finalPath = await this.compressBackup(filePath);
        compressed = true;
      }

      // Get file size
      const stats = fs.statSync(finalPath);

      const backupInfo: BackupInfo = {
        id: backupId,
        fileName: path.basename(finalPath),
        filePath: finalPath,
        size: stats.size,
        createdAt: new Date(),
        type,
        compressed
      };

      // Log backup creation
      await this.logBackupOperation('CREATE', backupInfo);

      console.log(`✅ Backup created: ${backupInfo.fileName} (${this.formatBytes(backupInfo.size)})`);
      return backupInfo;

    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Get list of available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    if (!fs.existsSync(this.config.backupPath)) {
      return backups;
    }

    const files = fs.readdirSync(this.config.backupPath);
    
    for (const file of files) {
      if (file.startsWith('backup_') && (file.endsWith('.db') || file.endsWith('.db.gz'))) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = fs.statSync(filePath);
        
        // Parse backup info from filename
        const parts = file.replace('.db.gz', '').replace('.db', '').split('_');
        const type = parts[parts.length - 1] as 'automatic' | 'manual';
        const dateStr = parts.slice(1, -1).join('_');
        
        backups.push({
          id: file.replace('.db.gz', '').replace('.db', ''),
          fileName: file,
          filePath,
          size: stats.size,
          createdAt: new Date(dateStr.replace(/-/g, ':')),
          type,
          compressed: file.endsWith('.gz')
        });
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    console.log(`📁 Restoring from backup: ${backup.fileName}`);

    const database = getDatabase();
    if (!database.instance) {
      throw new Error('Database not initialized');
    }

    // Create temporary file for restoration
    let tempPath = backup.filePath;
    
    // Decompress if needed
    if (backup.compressed) {
      tempPath = await this.decompressBackup(backup.filePath);
    }

    try {
      // Close current database connection
      await database.close();
      
      // Copy backup to main database location
      const dbPath = process.env.DATABASE_PATH || './data/skillbox.db';
      fs.copyFileSync(tempPath, dbPath);
      
      // Reconnect to database
      await database.connect();
      
      await this.logBackupOperation('RESTORE', backup);
      console.log(`✅ Database restored from backup: ${backup.fileName}`);
      
    } finally {
      // Clean up temporary decompressed file
      if (backup.compressed && tempPath !== backup.filePath) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    fs.unlinkSync(backup.filePath);
    await this.logBackupOperation('DELETE', backup);
    console.log(`🗑️ Backup deleted: ${backup.fileName}`);
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    automaticBackups: number;
    manualBackups: number;
  }> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        automaticBackups: 0,
        manualBackups: 0
      };
    }

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup: backups[backups.length - 1]?.createdAt,
      newestBackup: backups[0]?.createdAt,
      automaticBackups: backups.filter(b => b.type === 'automatic').length,
      manualBackups: backups.filter(b => b.type === 'manual').length
    };
  }

  /**
   * Stop backup service
   */
  stop(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
      console.log('📁 Backup service stopped');
    }
  }

  // Private methods

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
      console.log(`📁 Created backup directory: ${this.config.backupPath}`);
    }
  }

  private scheduleAutomaticBackups(): void {
    const intervalMs = this.config.interval * 60 * 60 * 1000; // Convert hours to milliseconds
    
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup('automatic');
        await this.cleanupOldBackups();
      } catch (error) {
        console.error('🚨 Automatic backup failed:', error);
      }
    }, intervalMs);
  }

  private async createSQLiteBackup(db: any, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Einfache Dateikopie der SQLite-Datei
        const sourcePath = process.env.DATABASE_PATH || './data/skillbox.db';
        
        // Überprüfe ob Quelldatei existiert
        if (!fs.existsSync(sourcePath)) {
          reject(new Error(`Source database file not found: ${sourcePath}`));
          return;
        }
        
        // Kopiere die Datei
        fs.copyFileSync(sourcePath, targetPath);
        
        // Überprüfe ob Backup erstellt wurde
        if (fs.existsSync(targetPath)) {
          const stats = fs.statSync(targetPath);
          if (stats.size > 0) {
            console.log(`📁 SQLite backup created: ${stats.size} bytes`);
            resolve();
          } else {
            reject(new Error('Backup file created but is empty'));
          }
        } else {
          reject(new Error('Backup file was not created'));
        }
      } catch (error) {
        reject(new Error(`SQLite backup failed: ${error}`));
      }
    });
  }

  private async compressBackup(filePath: string): Promise<string> {
    const compressedPath = `${filePath}.gz`;
    
    try {
      await execAsync(`gzip -9 "${filePath}"`);
      return compressedPath;
    } catch (error) {
      console.warn('⚠️ Compression failed, keeping uncompressed backup');
      return filePath;
    }
  }

  private async decompressBackup(filePath: string): Promise<string> {
    const tempPath = filePath.replace('.gz', '.temp');
    
    try {
      await execAsync(`gunzip -c "${filePath}" > "${tempPath}"`);
      return tempPath;
    } catch (error) {
      throw new Error(`Decompression failed: ${error}`);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    // Remove backups older than retention period
    const oldBackups = backups.filter(b => b.createdAt < cutoffDate);
    
    // Also remove excess backups if we exceed maxBackups
    const excessBackups = backups.slice(this.config.maxBackups);
    
    const backupsToRemove = [...oldBackups, ...excessBackups];
    
    for (const backup of backupsToRemove) {
      try {
        fs.unlinkSync(backup.filePath);
        console.log(`🗑️ Cleaned up old backup: ${backup.fileName}`);
      } catch (error) {
        console.error(`Failed to remove backup ${backup.fileName}:`, error);
      }
    }

    if (backupsToRemove.length > 0) {
      console.log(`📁 Cleanup completed: removed ${backupsToRemove.length} old backups`);
    }
  }

  private async logBackupOperation(operation: 'CREATE' | 'RESTORE' | 'DELETE', backup: BackupInfo): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      backupId: backup.id,
      fileName: backup.fileName,
      size: backup.size,
      type: backup.type
    };

    // Log to console and optionally to audit log
    console.log(`📁 [BACKUP] ${operation}: ${backup.fileName}`);
    
    // TODO: Add to audit log if needed
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
let backupServiceInstance: BackupService | null = null;

export function getBackupService(): BackupService {
  if (!backupServiceInstance) {
    const config: BackupConfig = {
      enabled: process.env.BACKUP_ENABLED === 'true' || true, // Default enabled in dev
      interval: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24'),
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
      maxBackups: parseInt(process.env.BACKUP_MAX_COUNT || '10'),
      backupPath: process.env.BACKUP_PATH || './data/backups',
      compressionEnabled: process.env.BACKUP_COMPRESSION === 'true' || true
    };
    
    backupServiceInstance = new BackupService(config);
  }
  
  return backupServiceInstance;
} 