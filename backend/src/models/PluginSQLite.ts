import { Database, getDatabase } from '../database/database';
import { 
  Plugin, 
  PluginConfig, 
  AssistantPlugin, 
  PluginExecution,
  CreatePluginRequest,
  UpdatePluginRequest,
  PluginConfigRequest,
  AssistantPluginRequest,
  PluginManifest,
  PluginConfigSchema,
  generatePluginId,
  generatePluginConfigId,
  generateAssistantPluginId,
  generatePluginExecutionId,
  validatePluginManifest
} from './Plugin';

export class PluginModelSQLite {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // ===============================
  // PLUGIN MANAGEMENT
  // ===============================

  async findAllPlugins(): Promise<Plugin[]> {
    const plugins = await this.db.all<Plugin>(
      `SELECT id, name, display_name, description, version, author, plugin_type, runtime_type, 
              config_schema, manifest, is_active, is_public, created_at, updated_at, created_by, updated_by 
       FROM plugins 
       ORDER BY display_name ASC`
    );
    
    return plugins.map(plugin => ({
      ...plugin,
      is_active: Boolean(plugin.is_active),
      is_public: Boolean(plugin.is_public)
    }));
  }

  async findActivePlugins(): Promise<Plugin[]> {
    const plugins = await this.db.all<Plugin>(
      `SELECT id, name, display_name, description, version, author, plugin_type, runtime_type, 
              config_schema, manifest, is_active, is_public, created_at, updated_at, created_by, updated_by 
       FROM plugins 
       WHERE is_active = 1 
       ORDER BY display_name ASC`
    );
    
    return plugins.map(plugin => ({
      ...plugin,
      is_active: Boolean(plugin.is_active),
      is_public: Boolean(plugin.is_public)
    }));
  }

  async findPluginById(id: string): Promise<Plugin | null> {
    const plugin = await this.db.get<Plugin>(
      `SELECT id, name, display_name, description, version, author, plugin_type, runtime_type, 
              config_schema, manifest, is_active, is_public, created_at, updated_at, created_by, updated_by 
       FROM plugins 
       WHERE id = ?`,
      [id]
    );
    
    if (plugin) {
      return {
        ...plugin,
        is_active: Boolean(plugin.is_active),
        is_public: Boolean(plugin.is_public)
      };
    }
    
    return null;
  }

  async createPlugin(data: CreatePluginRequest, createdBy?: string): Promise<Plugin> {
    // Validate manifest
    const manifestErrors = validatePluginManifest(data.manifest);
    if (manifestErrors.length > 0) {
      throw new Error(`Invalid plugin manifest: ${manifestErrors.join(', ')}`);
    }

    // Check if plugin name already exists
    const existing = await this.findPluginByName(data.name);
    if (existing) {
      throw new Error(`Plugin with name '${data.name}' already exists`);
    }

    const id = generatePluginId();
    const now = new Date().toISOString();
    
    await this.db.run(
      `INSERT INTO plugins (id, name, display_name, description, version, author, plugin_type, runtime_type, 
                           config_schema, manifest, is_active, is_public, created_at, updated_at, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.display_name,
        data.description || null,
        data.version || '1.0.0',
        data.author || null,
        data.plugin_type,
        data.runtime_type,
        data.config_schema ? JSON.stringify(data.config_schema) : null,
        JSON.stringify(data.manifest),
        1, // is_active
        data.is_public ? 1 : 0,
        now,
        now,
        createdBy || null
      ]
    );
    
    const plugin = await this.findPluginById(id);
    if (!plugin) {
      throw new Error('Failed to create plugin');
    }
    
    console.log(`✅ Created plugin: ${plugin.display_name} (${plugin.id})`);
    return plugin;
  }

  async updatePlugin(id: string, data: UpdatePluginRequest, updatedBy?: string): Promise<Plugin | null> {
    const existing = await this.findPluginById(id);
    if (!existing) {
      return null;
    }

    // Validate manifest if provided
    if (data.manifest) {
      const manifestErrors = validatePluginManifest(data.manifest);
      if (manifestErrors.length > 0) {
        throw new Error(`Invalid plugin manifest: ${manifestErrors.join(', ')}`);
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(data.display_name);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }
    
    if (data.version !== undefined) {
      updates.push('version = ?');
      params.push(data.version);
    }
    
    if (data.author !== undefined) {
      updates.push('author = ?');
      params.push(data.author || null);
    }
    
    if (data.plugin_type !== undefined) {
      updates.push('plugin_type = ?');
      params.push(data.plugin_type);
    }
    
    if (data.runtime_type !== undefined) {
      updates.push('runtime_type = ?');
      params.push(data.runtime_type);
    }
    
    if (data.config_schema !== undefined) {
      updates.push('config_schema = ?');
      params.push(data.config_schema ? JSON.stringify(data.config_schema) : null);
    }
    
    if (data.manifest !== undefined) {
      updates.push('manifest = ?');
      params.push(JSON.stringify(data.manifest));
    }
    
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    
    if (data.is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(data.is_public ? 1 : 0);
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    if (updatedBy) {
      updates.push('updated_by = ?');
      params.push(updatedBy);
    }
    
    params.push(id);
    
    await this.db.run(
      `UPDATE plugins SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const updated = await this.findPluginById(id);
    if (updated) {
      console.log(`✅ Updated plugin: ${updated.display_name} (${updated.id})`);
    }
    
    return updated;
  }

  async deletePlugin(id: string): Promise<boolean> {
    const existing = await this.findPluginById(id);
    if (!existing) {
      return false;
    }

    // Delete related records first (when tables exist)
    try {
      await this.db.run('DELETE FROM assistant_plugins WHERE plugin_id = ?', [id]);
      await this.db.run('DELETE FROM plugin_configs WHERE plugin_id = ?', [id]);
      await this.db.run('DELETE FROM plugin_executions WHERE plugin_id = ?', [id]);
    } catch (error) {
      // Tables might not exist yet, continue with plugin deletion
      console.log('Note: Some plugin-related tables do not exist yet, continuing...');
    }
    
    // Delete the plugin
    await this.db.run('DELETE FROM plugins WHERE id = ?', [id]);
    
    console.log(`🗑️ Deleted plugin: ${existing.display_name} (${existing.id})`);
    return true;
  }

  async getResolvedPluginConfig(pluginId: string, userId?: string): Promise<{ [key: string]: any }> {
    // Get global config first
    const globalConfig = await this.findPluginConfig(pluginId);
    let resolvedConfig = globalConfig ? JSON.parse(globalConfig.config_data) : {};
    
    // Override with user-specific config if exists
    if (userId) {
      const userConfig = await this.findPluginConfig(pluginId, userId);
      if (userConfig) {
        const userConfigData = JSON.parse(userConfig.config_data);
        resolvedConfig = { ...resolvedConfig, ...userConfigData };
      }
    }
    
    return resolvedConfig;
  }

  async getPluginConfig(pluginId: string, userId?: string): Promise<PluginConfig | null> {
    return this.findPluginConfig(pluginId, userId);
  }

  async updatePluginConfig(pluginId: string, configData: any, userId?: string): Promise<PluginConfig> {
    const existing = await this.findPluginConfig(pluginId, userId);
    const now = new Date().toISOString();
    
    // Ensure configData is properly serialized - if it's already a string, don't double-encode
    const serializedConfig = typeof configData === 'string' ? configData : JSON.stringify(configData);
    
    if (existing) {
      // Update existing config
      await this.db.run(
        'UPDATE plugin_configs SET config_data = ?, updated_at = ? WHERE id = ?',
        [serializedConfig, now, existing.id]
      );
      
      const updated = await this.findPluginConfig(pluginId, userId);
      if (!updated) {
        throw new Error('Failed to update plugin config');
      }
      return updated;
    } else {
      // Create new config
      const id = `config_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      await this.db.run(
        'INSERT INTO plugin_configs (id, plugin_id, user_id, config_data, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, pluginId, userId || null, serializedConfig, 1, now, now]
      );
      
      const created = await this.findPluginConfig(pluginId, userId);
      if (!created) {
        throw new Error('Failed to create plugin config');
      }
      return created;
    }
  }

  async findByName(name: string): Promise<Plugin | null> {
    const plugin = await this.db.get<Plugin>(
      `SELECT id, name, display_name, description, version, author, plugin_type, runtime_type, 
              config_schema, manifest, is_active, is_public, created_at, updated_at, created_by, updated_by 
       FROM plugins 
       WHERE name = ?`,
      [name]
    );
    
    if (plugin) {
      return {
        ...plugin,
        is_active: Boolean(plugin.is_active),
        is_public: Boolean(plugin.is_public)
      };
    }
    
    return null;
  }

  async findPluginByName(name: string): Promise<Plugin | null> {
    return this.findByName(name);
  }

  private async findPluginConfig(pluginId: string, userId?: string): Promise<PluginConfig | null> {
    const config = await this.db.get<PluginConfig>(
      'SELECT id, plugin_id, user_id, config_data, is_active, created_at, updated_at, created_by, updated_by FROM plugin_configs WHERE plugin_id = ? AND user_id IS ? AND is_active = 1',
      [pluginId, userId || null]
    );
    
    if (config) {
      return {
        ...config,
        is_active: Boolean(config.is_active)
      };
    }
    
    return null;
  }
}

// Singleton pattern for global access
let pluginModelInstance: PluginModelSQLite | null = null;

export const createPluginModel = (database: Database): PluginModelSQLite => {
  if (!pluginModelInstance) {
    pluginModelInstance = new PluginModelSQLite(database);
  }
  return pluginModelInstance;
};

export const getPluginModel = (): PluginModelSQLite => {
  if (!pluginModelInstance) {
    const db = getDatabase();
    pluginModelInstance = new PluginModelSQLite(db);
  }
  return pluginModelInstance;
}; 