import { Database } from 'sqlite3';
import { logger } from '../../utils/logger';

export const migration = {
  version: 7,
  name: 'create_settings_table',
  up: async (db: Database): Promise<void> => {
    return new Promise((resolve, reject) => {
      logger.info('🔧 Running migration: Create settings table');
      
      const sql = `
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          encrypted BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      `;
      
      db.exec(sql, (err) => {
        if (err) {
          logger.error('❌ Failed to create settings table:', err);
          reject(err);
        } else {
          logger.info('✅ Settings table created successfully');
          resolve();
        }
      });
    });
  },
  
  down: async (db: Database): Promise<void> => {
    return new Promise((resolve, reject) => {
      logger.info('🔄 Rolling back migration: Drop settings table');
      
      const sql = `
        DROP INDEX IF EXISTS idx_settings_key;
        DROP TABLE IF EXISTS settings;
      `;
      
      db.exec(sql, (err) => {
        if (err) {
          logger.error('❌ Failed to drop settings table:', err);
          reject(err);
        } else {
          logger.info('✅ Settings table dropped successfully');
          resolve();
        }
      });
    });
  }
}; 