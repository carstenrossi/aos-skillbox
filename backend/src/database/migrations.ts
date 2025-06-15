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
  },
  {
    version: 7,
    name: 'recreate_users_table_with_correct_schema',
    up: `
      -- Drop existing users table and recreate with correct schema
      DROP TABLE IF EXISTS users;
      
      CREATE TABLE users (
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
      DROP TABLE IF EXISTS users;
    `
  },
  {
    version: 8,
    name: 'create_tools_table',
    up: `
      CREATE TABLE IF NOT EXISTS tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        url TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        is_external BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_tools_sort_order ON tools(sort_order, is_active);
      CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active);
      
      CREATE TRIGGER IF NOT EXISTS tools_updated_at 
        AFTER UPDATE ON tools
        FOR EACH ROW
      BEGIN
        UPDATE tools SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `,
    down: `
      DROP TRIGGER IF EXISTS tools_updated_at;
      DROP INDEX IF EXISTS idx_tools_active;
      DROP INDEX IF EXISTS idx_tools_sort_order;
      DROP TABLE IF EXISTS tools;
    `
  },
  {
    version: 9,
    name: 'create_plugins_table',
    up: `
      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        version TEXT NOT NULL DEFAULT '1.0.0',
        author TEXT,
        plugin_type TEXT NOT NULL CHECK (plugin_type IN ('image_generation', 'audio_generation', 'video_generation', 'automation', 'api_tool', 'custom')) DEFAULT 'custom',
        runtime_type TEXT NOT NULL CHECK (runtime_type IN ('nodejs', 'python', 'api_call', 'webhook')) DEFAULT 'api_call',
        config_schema TEXT, -- JSON string for configuration schema (like Valves)
        manifest TEXT NOT NULL, -- JSON string for plugin manifest
        is_active BOOLEAN DEFAULT 1,
        is_public BOOLEAN DEFAULT 0, -- Can be used by all users
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
      CREATE INDEX IF NOT EXISTS idx_plugins_type ON plugins(plugin_type);
      CREATE INDEX IF NOT EXISTS idx_plugins_runtime ON plugins(runtime_type);
      CREATE INDEX IF NOT EXISTS idx_plugins_active ON plugins(is_active);
      CREATE INDEX IF NOT EXISTS idx_plugins_public ON plugins(is_public);
      
      CREATE TRIGGER IF NOT EXISTS plugins_updated_at 
        AFTER UPDATE ON plugins
        FOR EACH ROW
      BEGIN
        UPDATE plugins SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `,
    down: `
      DROP TRIGGER IF EXISTS plugins_updated_at;
      DROP INDEX IF EXISTS idx_plugins_public;
      DROP INDEX IF EXISTS idx_plugins_active;
      DROP INDEX IF EXISTS idx_plugins_runtime;
      DROP INDEX IF EXISTS idx_plugins_type;
      DROP INDEX IF EXISTS idx_plugins_name;
      DROP TABLE IF EXISTS plugins;
    `
  },
  {
    version: 10,
    name: 'create_plugin_configs_table',
    up: `
      CREATE TABLE IF NOT EXISTS plugin_configs (
        id TEXT PRIMARY KEY,
        plugin_id TEXT NOT NULL,
        user_id TEXT, -- NULL = global/system config, specific user_id = user-specific config
        config_data TEXT NOT NULL, -- JSON string for configuration values
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT,
        FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(plugin_id, user_id) -- Only one config per plugin per user (or global)
      );
      
      CREATE INDEX IF NOT EXISTS idx_plugin_configs_plugin_id ON plugin_configs(plugin_id);
      CREATE INDEX IF NOT EXISTS idx_plugin_configs_user_id ON plugin_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_plugin_configs_active ON plugin_configs(is_active);
      
      CREATE TRIGGER IF NOT EXISTS plugin_configs_updated_at 
        AFTER UPDATE ON plugin_configs
        FOR EACH ROW
      BEGIN
        UPDATE plugin_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `,
    down: `
      DROP TRIGGER IF EXISTS plugin_configs_updated_at;
      DROP INDEX IF EXISTS idx_plugin_configs_active;
      DROP INDEX IF EXISTS idx_plugin_configs_user_id;
      DROP INDEX IF EXISTS idx_plugin_configs_plugin_id;
      DROP TABLE IF EXISTS plugin_configs;
    `
  },
  {
    version: 11,
    name: 'create_assistant_plugins_table',
    up: `
      CREATE TABLE IF NOT EXISTS assistant_plugins (
        id TEXT PRIMARY KEY,
        assistant_id TEXT NOT NULL,
        plugin_id TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        config_override TEXT, -- JSON string for assistant-specific plugin config overrides
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        updated_by TEXT,
        FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE,
        FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
        UNIQUE(assistant_id, plugin_id) -- Each plugin can only be assigned once per assistant
      );
      
      CREATE INDEX IF NOT EXISTS idx_assistant_plugins_assistant_id ON assistant_plugins(assistant_id);
      CREATE INDEX IF NOT EXISTS idx_assistant_plugins_plugin_id ON assistant_plugins(plugin_id);
      CREATE INDEX IF NOT EXISTS idx_assistant_plugins_enabled ON assistant_plugins(is_enabled);
      CREATE INDEX IF NOT EXISTS idx_assistant_plugins_sort_order ON assistant_plugins(sort_order);
      
      CREATE TRIGGER IF NOT EXISTS assistant_plugins_updated_at 
        AFTER UPDATE ON assistant_plugins
        FOR EACH ROW
      BEGIN
        UPDATE assistant_plugins SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `,
    down: `
      DROP TRIGGER IF EXISTS assistant_plugins_updated_at;
      DROP INDEX IF EXISTS idx_assistant_plugins_sort_order;
      DROP INDEX IF EXISTS idx_assistant_plugins_enabled;
      DROP INDEX IF EXISTS idx_assistant_plugins_plugin_id;
      DROP INDEX IF EXISTS idx_assistant_plugins_assistant_id;
      DROP TABLE IF EXISTS assistant_plugins;
    `
  },
  {
    version: 12,
    name: 'create_plugin_executions_table',
    up: `
      CREATE TABLE IF NOT EXISTS plugin_executions (
        id TEXT PRIMARY KEY,
        plugin_id TEXT NOT NULL,
        assistant_id TEXT,
        conversation_id TEXT,
        user_id TEXT NOT NULL,
        function_name TEXT NOT NULL,
        input_parameters TEXT, -- JSON string of input parameters
        output_result TEXT, -- JSON string of execution result
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
        error_message TEXT,
        execution_time_ms INTEGER,
        cost_cents INTEGER, -- Cost in cents for billing
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
        FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE SET NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_plugin_executions_plugin_id ON plugin_executions(plugin_id);
      CREATE INDEX IF NOT EXISTS idx_plugin_executions_user_id ON plugin_executions(user_id);
      CREATE INDEX IF NOT EXISTS idx_plugin_executions_conversation_id ON plugin_executions(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_plugin_executions_status ON plugin_executions(status);
      CREATE INDEX IF NOT EXISTS idx_plugin_executions_created_at ON plugin_executions(created_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_plugin_executions_created_at;
      DROP INDEX IF EXISTS idx_plugin_executions_status;
      DROP INDEX IF EXISTS idx_plugin_executions_conversation_id;
      DROP INDEX IF EXISTS idx_plugin_executions_user_id;
      DROP INDEX IF EXISTS idx_plugin_executions_plugin_id;
      DROP TABLE IF EXISTS plugin_executions;
    `
  },
  {
    version: 13,
    name: 'add_context_limit_to_assistants',
    up: `
      ALTER TABLE assistants ADD COLUMN context_limit INTEGER DEFAULT 32000;
      
      -- Create index for context_limit queries
      CREATE INDEX IF NOT EXISTS idx_assistants_context_limit ON assistants(context_limit);
    `,
    down: `
      DROP INDEX IF EXISTS idx_assistants_context_limit;
      
      -- Note: SQLite doesn't support DROP COLUMN, so we recreate the table
      CREATE TABLE assistants_backup AS SELECT 
        id, name, display_name, description, icon, api_url, jwt_token, 
        model_name, system_prompt, is_active, created_at, updated_at 
      FROM assistants;
      
      DROP TABLE assistants;
      
      CREATE TABLE assistants (
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
      
      INSERT INTO assistants SELECT * FROM assistants_backup;
      DROP TABLE assistants_backup;
      
      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_assistants_name ON assistants(name);
      CREATE INDEX IF NOT EXISTS idx_assistants_created_at ON assistants(created_at);
      CREATE INDEX IF NOT EXISTS idx_assistants_is_active ON assistants(is_active);
    `
  },
  {
    version: 14,
    name: 'create_settings_table',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        encrypted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `,
    down: `
      DROP INDEX IF EXISTS idx_settings_key;
      DROP TABLE IF EXISTS settings;
    `
  },
  {
    version: 17,
    name: 'create_files_table',
    up: `
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        s3_key TEXT UNIQUE NOT NULL,
        s3_url TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        content_type TEXT NOT NULL,
        file_category TEXT NOT NULL CHECK (file_category IN ('text', 'binary')) DEFAULT 'binary',
        uploaded_by TEXT NOT NULL,
        upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Text extraction fields
        extracted_text TEXT,
        extraction_status TEXT CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'not_applicable')) DEFAULT 'pending',
        extraction_error TEXT,
        extraction_timestamp DATETIME,
        
        -- Metadata
        metadata TEXT, -- JSON string for additional file metadata
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_files_file_category ON files(file_category);
      CREATE INDEX IF NOT EXISTS idx_files_extraction_status ON files(extraction_status);
      CREATE INDEX IF NOT EXISTS idx_files_upload_timestamp ON files(upload_timestamp);
      CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files(s3_key);
      CREATE INDEX IF NOT EXISTS idx_files_is_active ON files(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_files_is_active;
      DROP INDEX IF EXISTS idx_files_s3_key;
      DROP INDEX IF EXISTS idx_files_upload_timestamp;
      DROP INDEX IF EXISTS idx_files_extraction_status;
      DROP INDEX IF EXISTS idx_files_file_category;
      DROP INDEX IF EXISTS idx_files_uploaded_by;
      DROP TABLE IF EXISTS files;
    `
  },
  {
    version: 18,
    name: 'create_conversation_files_table_v2',
    up: `
      CREATE TABLE IF NOT EXISTS conversation_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        attached_by TEXT NOT NULL,
        attachment_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        attachment_context TEXT, -- Optional context about why file was attached
        is_active BOOLEAN DEFAULT 1,
        
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (attached_by) REFERENCES users(id) ON DELETE CASCADE,
        
        UNIQUE(conversation_id, file_id) -- Prevent duplicate attachments
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversation_files_conversation_id ON conversation_files(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_files_file_id ON conversation_files(file_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_files_attached_by ON conversation_files(attached_by);
      CREATE INDEX IF NOT EXISTS idx_conversation_files_timestamp ON conversation_files(attachment_timestamp);
      CREATE INDEX IF NOT EXISTS idx_conversation_files_is_active ON conversation_files(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_conversation_files_is_active;
      DROP INDEX IF EXISTS idx_conversation_files_timestamp;
      DROP INDEX IF EXISTS idx_conversation_files_attached_by;
      DROP INDEX IF EXISTS idx_conversation_files_file_id;
      DROP INDEX IF EXISTS idx_conversation_files_conversation_id;
      DROP TABLE IF EXISTS conversation_files;
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