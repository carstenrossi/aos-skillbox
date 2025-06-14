import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { getPluginModel } from '../models/PluginSQLite';

interface PluginMetadata {
  filename: string;
  pluginId: string;
  name: string;
  version?: string;
  lastModified: Date;
}

export class PluginMigrationService {
  private readonly pluginsDirectory: string;
  private readonly pluginModel = getPluginModel();

  constructor() {
    this.pluginsDirectory = path.join(__dirname, '../../plugins');
  }

  /**
   * Run complete plugin synchronization (import + export)
   */
  async runMigration(): Promise<void> {
    try {
      logger.info('🔌 Starting plugin migration...');
      
      // Ensure plugins directory exists
      if (!fs.existsSync(this.pluginsDirectory)) {
        fs.mkdirSync(this.pluginsDirectory, { recursive: true });
        logger.info('📁 Created plugins directory');
      }

      // Step 1: Import plugins from files to database
      await this.importPluginsFromFiles();
      
      // Step 2: Export database plugins to files
      await this.exportPluginsToFiles();
      
      logger.info('🎉 Plugin synchronization completed successfully');
    } catch (error) {
      logger.error('❌ Plugin migration failed:', error);
      throw error;
    }
  }

  /**
   * Import plugins from JSON files to database
   */
  private async importPluginsFromFiles(): Promise<void> {
    const pluginFiles = this.scanPluginFiles();
    const existingPlugins = await this.getExistingPlugins();
    const newPlugins = this.findNewPlugins(pluginFiles, existingPlugins);

    logger.info(`📁 Found ${pluginFiles.length} plugin files in directory`);
    logger.info(`💾 Found ${existingPlugins.length} existing plugins in database`);

    if (newPlugins.length === 0) {
      logger.info('✅ All file plugins are up to date, no import needed');
      return;
    }

    logger.info(`🆕 Found ${newPlugins.length} new plugins to import:`);
    newPlugins.forEach(plugin => {
      logger.info(`   - ${plugin.name} (${plugin.filename})`);
    });

    let successCount = 0;
    let failCount = 0;

    for (const plugin of newPlugins) {
      try {
        await this.importPlugin(plugin);
        logger.info(`✅ Successfully imported plugin: ${plugin.name}`);
        successCount++;
      } catch (error) {
        logger.error(`❌ Failed to import plugin ${plugin.name}:`, error instanceof Error ? error.message : error);
        failCount++;
      }
    }

    logger.info(`🎉 Plugin import completed:`);
    logger.info(`   ✅ Successfully imported: ${successCount} plugins`);
    if (failCount > 0) {
      logger.warn(`   ❌ Failed to import: ${failCount} plugins`);
    }
  }

  /**
   * Export database plugins to JSON files
   */
  private async exportPluginsToFiles(): Promise<void> {
    try {
      const allPlugins = await this.pluginModel.findAllPlugins();
      const existingFiles = this.scanPluginFiles();
      const existingFileNames = existingFiles.map(f => f.name);
      
      // Find plugins that exist in database but not as files
      const pluginsToExport = allPlugins.filter(plugin => 
        !existingFileNames.includes(plugin.name)
      );

      if (pluginsToExport.length === 0) {
        logger.info('✅ All database plugins already have files, no export needed');
        return;
      }

      logger.info(`📤 Found ${pluginsToExport.length} database plugins to export:`);
      pluginsToExport.forEach(plugin => {
        logger.info(`   - ${plugin.name}`);
      });

      let successCount = 0;
      let failCount = 0;

      for (const plugin of pluginsToExport) {
        try {
          await this.exportPlugin(plugin);
          logger.info(`✅ Successfully exported plugin: ${plugin.name}`);
          successCount++;
        } catch (error) {
          logger.error(`❌ Failed to export plugin ${plugin.name}:`, error instanceof Error ? error.message : error);
          failCount++;
        }
      }

      logger.info(`🎉 Plugin export completed:`);
      logger.info(`   ✅ Successfully exported: ${successCount} plugins`);
      if (failCount > 0) {
        logger.warn(`   ❌ Failed to export: ${failCount} plugins`);
      }
    } catch (error) {
      logger.error('❌ Plugin export failed:', error);
      throw error;
    }
  }

  /**
   * Export a single plugin from database to file
   */
  private async exportPlugin(plugin: any): Promise<void> {
    const filename = `${plugin.name}.json`;
    const filePath = path.join(this.pluginsDirectory, filename);
    
    // Create plugin file structure
    const pluginData = {
      id: plugin.name,
      name: plugin.name,
      display_name: plugin.display_name,
      description: plugin.description,
      version: plugin.version || '1.0.0',
      author: plugin.author || 'Admin',
      plugin_type: plugin.plugin_type,
      runtime_type: plugin.runtime_type,
      config_schema: plugin.config_schema ? JSON.parse(plugin.config_schema) : {},
      manifest: plugin.manifest ? JSON.parse(plugin.manifest) : {
        runtime: "nodejs",
        functions: []
      },
      is_active: plugin.is_active,
      is_public: plugin.is_public
    };

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(pluginData, null, 2), 'utf8');
    logger.debug(`📝 Exported plugin to file: ${filename}`);
  }

  /**
   * Manual sync endpoint - runs complete synchronization
   */
  async syncPlugins(): Promise<{ imported: number; exported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let exported = 0;

    try {
      // Import phase
      const pluginFiles = this.scanPluginFiles();
      const existingPlugins = await this.getExistingPlugins();
      const newPlugins = this.findNewPlugins(pluginFiles, existingPlugins);

      for (const plugin of newPlugins) {
        try {
          await this.importPlugin(plugin);
          imported++;
        } catch (error) {
          errors.push(`Import failed for ${plugin.name}: ${error instanceof Error ? error.message : error}`);
        }
      }

      // Export phase
      const allPlugins = await this.pluginModel.findAllPlugins();
      const existingFiles = this.scanPluginFiles();
      const existingFileNames = existingFiles.map(f => f.name);
      
      const pluginsToExport = allPlugins.filter(plugin => 
        !existingFileNames.includes(plugin.name)
      );

      for (const plugin of pluginsToExport) {
        try {
          await this.exportPlugin(plugin);
          exported++;
        } catch (error) {
          errors.push(`Export failed for ${plugin.name}: ${error instanceof Error ? error.message : error}`);
        }
      }

      return { imported, exported, errors };
    } catch (error) {
      errors.push(`Sync failed: ${error instanceof Error ? error.message : error}`);
      return { imported, exported, errors };
    }
  }

  /**
   * Scan plugins directory for JSON files
   */
  private scanPluginFiles(): PluginMetadata[] {
    const files = fs.readdirSync(this.pluginsDirectory);
    const pluginFiles: PluginMetadata[] = [];

    for (const filename of files) {
      if (!filename.endsWith('.json')) continue;
      
      // Skip template files
      if (filename.includes('template') || filename.includes('example')) {
        continue;
      }

      try {
        const filePath = path.join(this.pluginsDirectory, filename);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const pluginData = JSON.parse(content);

        pluginFiles.push({
          filename,
          pluginId: pluginData.id || filename.replace('.json', ''),
          name: pluginData.name || filename.replace('.json', ''),
          version: pluginData.version,
          lastModified: stats.mtime
        });
      } catch (error) {
        logger.warn(`⚠️ Skipping invalid plugin file ${filename}:`, error);
      }
    }

    return pluginFiles;
  }

  /**
   * Get existing plugins from database
   */
  private async getExistingPlugins(): Promise<string[]> {
    try {
      const plugins = await this.pluginModel.findAllPlugins();
      return plugins.map(plugin => plugin.name); // Use name instead of id for comparison
    } catch (error) {
      logger.error('Error fetching existing plugins:', error);
      return [];
    }
  }

  /**
   * Find plugins that need to be imported
   */
  private findNewPlugins(pluginFiles: PluginMetadata[], existingPlugins: string[]): PluginMetadata[] {
    return pluginFiles.filter(plugin => {
      // Check if plugin already exists in database by name
      const exists = existingPlugins.includes(plugin.name);
      logger.debug(`🔍 Plugin ${plugin.name}: exists=${exists}, existing=[${existingPlugins.join(', ')}]`);
      return !exists;
    });
  }

  /**
   * Import a single plugin to database
   */
  private async importPlugin(plugin: PluginMetadata): Promise<void> {
    const filePath = path.join(this.pluginsDirectory, plugin.filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const pluginData = JSON.parse(content);

    // Validate plugin data structure
    this.validatePluginData(pluginData, plugin.filename);

    // Import plugin using existing plugin model
    await this.pluginModel.createPlugin({
      name: pluginData.name,
      display_name: pluginData.display_name || pluginData.name,
      description: pluginData.description || '',
      version: pluginData.version || '1.0.0',
      author: pluginData.author,
      plugin_type: pluginData.plugin_type || 'api_tool',
      runtime_type: pluginData.runtime_type || 'api_call',
      config_schema: pluginData.config_schema,
      manifest: pluginData,
      is_public: true
    });
  }

  /**
   * Validate plugin data structure
   */
  private validatePluginData(pluginData: any, filename: string): void {
    const errors: string[] = [];

    // Basic required fields
    if (!pluginData.id || !pluginData.name) {
      errors.push('Plugin id and name are required');
    }

    // Check manifest structure
    if (!pluginData.manifest) {
      errors.push('Plugin manifest is required');
    } else {
      const manifest = pluginData.manifest;
      
      // Check runtime
      if (!manifest.runtime) {
        errors.push('Plugin runtime is required');
      }

      // Check functions array
      if (!manifest.functions || !Array.isArray(manifest.functions) || manifest.functions.length === 0) {
        errors.push('Plugin must have at least one function');
      }
    }

    if (errors.length > 0) {
      logger.error(`❌ Plugin validation failed for ${filename}:`, {
        pluginId: pluginData.id,
        pluginName: pluginData.name,
        hasManifest: !!pluginData.manifest,
        manifestRuntime: pluginData.manifest?.runtime,
        functionsCount: pluginData.manifest?.functions?.length || 0,
        errors
      });
      throw new Error(`Invalid plugin manifest: ${errors.join(', ')}`);
    }
  }
}

// Singleton instance
let pluginMigrationService: PluginMigrationService;

export const getPluginMigrationService = (): PluginMigrationService => {
  if (!pluginMigrationService) {
    pluginMigrationService = new PluginMigrationService();
  }
  return pluginMigrationService;
}; 