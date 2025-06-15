import { Database } from 'sqlite3';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface Setting {
  id?: number;
  key: string;
  value: string;
  encrypted: boolean;
  created_at?: string;
  updated_at?: string;
}

class SettingsService {
  private db: Database | null = null;
  private encryptionKey: string;

  constructor() {
    // Verwende eine feste Verschlüsselungsschlüssel für die Installation
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'skillbox-default-key-2025';
  }

  public setDatabase(database: Database): void {
    this.db = database;
    logger.info('🔧 Settings Service: Database connection established');
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted text
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  public async getSetting(key: string): Promise<string | null> {
    if (!this.db) {
      logger.error('🚨 Settings Service: Database not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      const sql = 'SELECT value, encrypted FROM settings WHERE key = ?';
      
      this.db!.get(sql, [key], (err, row: any) => {
        if (err) {
          logger.error(`🚨 Error getting setting ${key}:`, err.message);
          resolve(null);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const value = row.encrypted ? this.decrypt(row.value) : row.value;
          resolve(value);
        } catch (decryptError) {
          logger.error(`🚨 Error decrypting setting ${key}:`, decryptError);
          resolve(null);
        }
      });
    });
  }

  public async setSetting(key: string, value: string, encrypted: boolean = false): Promise<boolean> {
    if (!this.db) {
      logger.error('🚨 Settings Service: Database not initialized');
      return false;
    }

    const finalValue = encrypted ? this.encrypt(value) : value;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO settings (key, value, encrypted, updated_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db!.run(sql, [key, finalValue, encrypted], function(err) {
        if (err) {
          logger.error(`🚨 Error setting ${key}:`, err.message);
          resolve(false);
          return;
        }

        logger.info(`✅ Setting ${key} saved successfully`);
        resolve(true);
      });
    });
  }

  public async getSettings(keyPrefix?: string): Promise<Setting[]> {
    if (!this.db) {
      logger.error('🚨 Settings Service: Database not initialized');
      return [];
    }

    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM settings';
      let params: any[] = [];

      if (keyPrefix) {
        sql += ' WHERE key LIKE ?';
        params.push(`${keyPrefix}%`);
      }

      sql += ' ORDER BY key';

      this.db!.all(sql, params, (err, rows: any[]) => {
        if (err) {
          logger.error('🚨 Error getting settings:', err.message);
          resolve([]);
          return;
        }

        const settings = rows.map(row => ({
          ...row,
          value: row.encrypted ? this.decrypt(row.value) : row.value
        }));

        resolve(settings);
      });
    });
  }

  public async deleteSetting(key: string): Promise<boolean> {
    if (!this.db) {
      logger.error('🚨 Settings Service: Database not initialized');
      return false;
    }

    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM settings WHERE key = ?';
      
      this.db!.run(sql, [key], function(err) {
        if (err) {
          logger.error(`🚨 Error deleting setting ${key}:`, err.message);
          resolve(false);
          return;
        }

        logger.info(`✅ Setting ${key} deleted successfully`);
        resolve(true);
      });
    });
  }

  // S3-spezifische Hilfsmethoden
  public async getS3Config(): Promise<{
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucket?: string;
    publicUrlPrefix?: string;
  }> {
    const [accessKeyId, secretAccessKey, region, bucket, publicUrlPrefix] = await Promise.all([
      this.getSetting('s3_access_key_id'),
      this.getSetting('s3_secret_access_key'),
      this.getSetting('s3_region'),
      this.getSetting('s3_bucket'),
      this.getSetting('s3_public_url_prefix')
    ]);

    return {
      accessKeyId: accessKeyId || undefined,
      secretAccessKey: secretAccessKey || undefined,
      region: region || undefined,
      bucket: bucket || undefined,
      publicUrlPrefix: publicUrlPrefix || undefined
    };
  }

  public async setS3Config(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    publicUrlPrefix?: string;
  }): Promise<boolean> {
    try {
      const results = await Promise.all([
        this.setSetting('s3_access_key_id', config.accessKeyId, true),
        this.setSetting('s3_secret_access_key', config.secretAccessKey, true),
        this.setSetting('s3_region', config.region),
        this.setSetting('s3_bucket', config.bucket),
        this.setSetting('s3_public_url_prefix', config.publicUrlPrefix || '')
      ]);

      return results.every(result => result === true);
    } catch (error) {
      logger.error('🚨 Error saving S3 configuration:', error);
      return false;
    }
  }
}

export const settingsService = new SettingsService(); 