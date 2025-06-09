import express from 'express';
import { getPluginModel } from '../models/PluginSQLite';

const router = express.Router();

// Get all plugins
router.get('/', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const plugins = await pluginModel.findAllPlugins();
    
    return res.json({
      success: true,
      data: plugins,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching plugins:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch plugins' },
      timestamp: new Date().toISOString()
    });
  }
});

// Get plugin by ID
router.get('/:id', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const plugin = await pluginModel.findPluginById(req.params.id);
    
    if (!plugin) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Plugin not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({
      success: true,
      data: plugin,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching plugin:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch plugin' },
      timestamp: new Date().toISOString()
    });
  }
});

// Create new plugin (Admin only - kann später erweitert werden)
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      display_name, 
      description, 
      version,
      author,
      plugin_type, 
      runtime_type, 
      manifest,
      config_schema,
      is_public
    } = req.body;
    
    if (!name || !display_name || !plugin_type || !runtime_type || !manifest) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Required fields: name, display_name, plugin_type, runtime_type, manifest' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔧 Creating new plugin:`, { name, display_name, plugin_type });
    
    const pluginModel = getPluginModel();
    
    const plugin = await pluginModel.createPlugin({
      name,
      display_name,
      description,
      version,
      author,
      plugin_type,
      runtime_type,
      manifest,
      config_schema,
      is_public
    });
    
    console.log(`✅ Plugin created successfully with ID: ${plugin.id}`);
    
    return res.status(201).json({
      success: true,
      data: plugin,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating plugin:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        error: { message: error.message },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create plugin' },
      timestamp: new Date().toISOString()
    });
  }
});

// Update plugin
router.put('/:id', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const updateData = req.body;
    
    console.log(`🔧 Updating plugin ${req.params.id}`);
    
    const plugin = await pluginModel.updatePlugin(req.params.id, updateData);
    
    if (!plugin) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Plugin not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Plugin updated successfully: ${plugin.display_name}`);
    
    return res.json({
      success: true,
      data: plugin,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating plugin:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to update plugin' },
      timestamp: new Date().toISOString()
    });
  }
});

// Delete plugin
router.delete('/:id', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const deleted = await pluginModel.deletePlugin(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Plugin not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🗑️ Plugin deleted successfully: ${req.params.id}`);
    
    return res.json({
      success: true,
      data: { message: 'Plugin deleted successfully' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting plugin:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to delete plugin' },
      timestamp: new Date().toISOString()
    });
  }
});

// Get plugin configuration
router.get('/:id/config', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const config = await pluginModel.getPluginConfig(req.params.id);
    
    return res.json({
      success: true,
      data: config || { config_data: {} },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching plugin config:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch plugin configuration' },
      timestamp: new Date().toISOString()
    });
  }
});

// Update plugin configuration
router.put('/:id/config', async (req, res) => {
  try {
    const pluginModel = getPluginModel();
    const config = await pluginModel.updatePluginConfig(req.params.id, req.body);
    
    return res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating plugin config:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to update plugin configuration' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 