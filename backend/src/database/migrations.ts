import { Database, getDatabase } from './database';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_assistants_table',
    up: `
      CREATE TABLE IF NOT EXISTS assistants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_name TEXT,
        description TEXT,
        icon TEXT,
        api_url TEXT NOT NULL,
        jwt_token TEXT,
        model_name TEXT,
        system_prompt TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_assistants_name ON assistants(name);
      CREATE INDEX IF NOT EXISTS idx_assistants_created_at ON assistants(created_at);
      CREATE INDEX IF NOT EXISTS idx_assistants_is_active ON assistants(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_assistants_is_active;
      DROP INDEX IF EXISTS idx_assistants_created_at;
      DROP INDEX IF EXISTS idx_assistants_name;
      DROP TABLE IF EXISTS assistants;
    `
  },
  {
    version: 2,
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP TABLE IF EXISTS migrations;
    `
  },
  {
    version: 3,
    name: 'migrate_assistants_from_json',
    up: `
      -- This migration will be handled in code to import from assistants.json
      -- The migration record will be added automatically by MigrationManager
    `,
    down: `
      DELETE FROM assistants;
    `
  },
  {
    version: 4,
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
        is_active BOOLEAN DEFAULT 1,
        is_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_users_is_active;
      DROP INDEX IF EXISTS idx_users_role;
      DROP INDEX IF EXISTS idx_users_email;
      DROP INDEX IF EXISTS idx_users_username;
      DROP TABLE IF EXISTS users;
    `
  },
  {
    version: 5,
    name: 'create_conversations_table',
    up: `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        assistant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_message_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_assistant_id ON conversations(assistant_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_conversations_is_active;
      DROP INDEX IF EXISTS idx_conversations_last_message_at;
      DROP INDEX IF EXISTS idx_conversations_created_at;
      DROP INDEX IF EXISTS idx_conversations_assistant_id;
      DROP INDEX IF EXISTS idx_conversations_user_id;
      DROP TABLE IF EXISTS conversations;
    `
  },
  {
    version: 6,
    name: 'create_messages_table',
    up: `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata TEXT, -- JSON string for additional data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_messages_created_at;
      DROP INDEX IF EXISTS idx_messages_role;
      DROP INDEX IF EXISTS idx_messages_conversation_id;
      DROP TABLE IF EXISTS messages;
    `
  }
];

export class MigrationManager {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async init(): Promise<void> {
    // Create migrations table first
    const migrationTableMigration = migrations.find(m => m.name === 'create_migrations_table');
    if (migrationTableMigration) {
      await this.db.exec(migrationTableMigration.up);
    }
  }

  async getExecutedMigrations(): Promise<number[]> {
    try {
      const result = await this.db.all<{ version: number }>('SELECT version FROM migrations ORDER BY version');
      return result.map(r => r.version);
    } catch (error) {
      // Table doesn't exist yet
      return [];
    }
  }

  async executeMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Executing migration ${migration.version}: ${migration.name}`);
    
    try {
      // Execute the migration
      await this.db.exec(migration.up);
      
      // Record the migration
      await this.db.run(
        'INSERT INTO migrations (version, name) VALUES (?, ?)',
        [migration.version, migration.name]
      );
      
      console.log(`✅ Migration ${migration.version} completed successfully`);
    } catch (error) {
      console.error(`🚨 Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    console.log(`⏪ Rolling back migration ${migration.version}: ${migration.name}`);
    
    try {
      // Execute the rollback
      await this.db.exec(migration.down);
      
      // Remove the migration record
      await this.db.run('DELETE FROM migrations WHERE version = ?', [migration.version]);
      
      console.log(`✅ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      console.error(`🚨 Rollback ${migration.version} failed:`, error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Starting database migrations...');
    
    await this.init();
    
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = migrations.filter(m => !executedMigrations.includes(m.version));
    
    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are up to date');
      return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations.sort((a, b) => a.version - b.version)) {
      await this.executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully');
  }

  async rollbackTo(targetVersion: number): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const migrationsToRollback = migrations
      .filter(m => executedMigrations.includes(m.version) && m.version > targetVersion)
      .sort((a, b) => b.version - a.version); // Rollback in reverse order
    
    console.log(`⏪ Rolling back ${migrationsToRollback.length} migrations to version ${targetVersion}`);
    
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }
    
    console.log('✅ Rollback completed');
  }

  async getCurrentVersion(): Promise<number> {
    const executedMigrations = await this.getExecutedMigrations();
    return executedMigrations.length > 0 ? Math.max(...executedMigrations) : 0;
  }
}

export const runMigrations = async (): Promise<void> => {
  const db = getDatabase();
  const migrationManager = new MigrationManager(db);
  await migrationManager.runMigrations();
};

export const createMigrationManager = (database: Database): MigrationManager => {
  return new MigrationManager(database);
}; 