import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

// Enable verbose mode for development
sqlite3.verbose();

export interface DatabaseConfig {
  filename: string;
  mode?: number;
}

export class Database {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  get instance(): sqlite3.Database | null {
    return this.db;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(this.config.filename);
      
      this.db = new sqlite3.Database(dbPath, this.config.mode || sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          console.error('🚨 Error connecting to database:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database at:', dbPath);
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          console.error('🚨 Error closing database:', err.message);
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          console.error('🚨 SQL Error:', err.message);
          console.error('🚨 SQL:', sql);
          console.error('🚨 Params:', params);
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          console.error('🚨 SQL Error:', err.message);
          console.error('🚨 SQL:', sql);
          console.error('🚨 Params:', params);
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          console.error('🚨 SQL Error:', err.message);
          console.error('🚨 SQL:', sql);
          console.error('🚨 Params:', params);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    return new Promise((resolve, reject) => {
      this.db!.exec(sql, (err) => {
        if (err) {
          console.error('🚨 SQL Error:', err.message);
          console.error('🚨 SQL:', sql);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Singleton database instance
let database: Database | null = null;

export const getDatabase = (): Database => {
  if (!database) {
    const dbPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'data', 'skillbox.db')
      : path.join(__dirname, '../../data/skillbox.db');
    
    database = new Database({ filename: dbPath });
  }
  return database;
};

export const connectDatabase = async (): Promise<Database> => {
  const db = getDatabase();
  await db.connect();
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (database) {
    await database.close();
    database = null;
  }
}; 