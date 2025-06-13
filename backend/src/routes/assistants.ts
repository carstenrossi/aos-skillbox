import express from 'express';
import { getAssistantModel } from '../models/AssistantSQLite';
import { getDatabase } from '../database/database';

const router = express.Router();

// Get all assistants
router.get('/', async (req, res) => {
  try {
    const assistantModel = getAssistantModel();
    const assistants = await assistantModel.findAll();
    
    // Hide JWT tokens in response for security
    const sanitizedAssistants = assistants.map(assistant => ({
      ...assistant,
      jwt_token: assistant.jwt_token ? '***' : undefined
    }));
    
    return res.json({
      success: true,
      data: sanitizedAssistants,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching assistants:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch assistants' },
      timestamp: new Date().toISOString()
    });
  }
});

// Get assistant by ID
router.get('/:id', async (req, res) => {
  try {
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(req.params.id);
    
    if (!assistant) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    // Hide JWT token in response for security
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: assistant.jwt_token ? '***' : undefined
    };
    
    return res.json({
      success: true,
      data: sanitizedAssistant,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching assistant:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch assistant' },
      timestamp: new Date().toISOString()
    });
  }
});

// Create new assistant
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      display_name, 
      description, 
      icon, 
      api_url, 
      jwt_token, 
      model_name, 
      system_prompt, 
      is_active 
    } = req.body;
    
    if (!name || !api_url) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Name and API URL are required' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🔧 Creating new assistant:`, {
      name,
      display_name,
      description,
      icon,
      api_url,
      jwt_token: jwt_token ? jwt_token.substring(0, 10) + '...' : undefined,
      model_name,
      system_prompt: system_prompt ? system_prompt.substring(0, 50) + '...' : undefined,
      is_active
    });
    
    const assistantModel = getAssistantModel();
    
    // Check if assistant with same name already exists
    const existing = await assistantModel.findByName(name);
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: { message: 'Assistant with this name already exists' },
        timestamp: new Date().toISOString()
      });
    }
    
    const assistant = await assistantModel.create({
      name,
      display_name: display_name || name,
      description: description || `AI Assistant: ${name}`,
      icon: icon || '🤖',
      api_url,
      jwt_token: jwt_token || '',
      model_name: model_name || name.toLowerCase().replace(/\s+/g, '-'),
      system_prompt: system_prompt || 'You are a helpful AI Assistant. Answer in the language the user uses to query you.',
      is_active: is_active !== undefined ? is_active : true
    });
    
    console.log(`✅ Assistant created successfully with ID: ${assistant.id}`);
    
    // Hide JWT token in response for security
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: assistant.jwt_token ? '***' : undefined
    };
    
    return res.status(201).json({
      success: true,
      data: sanitizedAssistant,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating assistant:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create assistant' },
      timestamp: new Date().toISOString()
    });
  }
});

// Update assistant
router.put('/:id', async (req, res) => {
  try {
    const { 
      name, 
      display_name, 
      description, 
      icon, 
      api_url, 
      jwt_token, 
      model_name, 
      system_prompt, 
      is_active 
    } = req.body;
    
    console.log(`🔧 Updating assistant ${req.params.id} with data:`, {
      name,
      display_name,
      description,
      icon,
      api_url,
      jwt_token: jwt_token ? jwt_token.substring(0, 10) + '...' : undefined,
      model_name,
      system_prompt: system_prompt ? system_prompt.substring(0, 50) + '...' : undefined,
      is_active
    });
    
    const assistantModel = getAssistantModel();
    
    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (api_url !== undefined) updateData.api_url = api_url;
    if (jwt_token !== undefined) updateData.jwt_token = jwt_token;
    if (model_name !== undefined) updateData.model_name = model_name;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const assistant = await assistantModel.update(req.params.id, updateData);
    
    if (!assistant) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Assistant ${req.params.id} updated successfully`);
    
    // Hide JWT token in response for security
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: assistant.jwt_token ? '***' : undefined
    };
    
    return res.json({
      success: true,
      data: sanitizedAssistant,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to update assistant' },
      timestamp: new Date().toISOString()
    });
  }
});

// Delete assistant
router.delete('/:id', async (req, res) => {
  try {
    const assistantModel = getAssistantModel();
    const deleted = await assistantModel.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Assistant deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to delete assistant' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

// ===============================
// ASSISTANT-PLUGIN MANAGEMENT ENDPOINTS
// ===============================

// Get plugins assigned to an assistant
router.get('/:id/plugins', async (req, res) => {
  try {
    const { id: assistantId } = req.params;
    const db = getDatabase();

    const assignedPlugins = await db.all(
      `SELECT ap.*, p.name, p.display_name, p.description, p.plugin_type, p.is_active as plugin_is_active
       FROM assistant_plugins ap
       JOIN plugins p ON ap.plugin_id = p.id
       WHERE ap.assistant_id = ?
       ORDER BY ap.sort_order ASC, ap.created_at ASC`,
      [assistantId]
    );

    const formattedPlugins = assignedPlugins.map(ap => ({
      id: ap.id,
      assistant_id: ap.assistant_id,
      plugin_id: ap.plugin_id,
      is_enabled: Boolean(ap.is_enabled),
      sort_order: ap.sort_order,
      config_override: ap.config_override ? JSON.parse(ap.config_override) : null,
      created_at: ap.created_at,
      updated_at: ap.updated_at,
      plugin: {
        name: ap.name,
        display_name: ap.display_name,
        description: ap.description,
        plugin_type: ap.plugin_type,
        is_active: Boolean(ap.plugin_is_active)
      }
    }));

    return res.json({
      success: true,
      data: formattedPlugins,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching assistant plugins:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch assistant plugins' },
      timestamp: new Date().toISOString()
    });
  }
});

// Assign a plugin to an assistant
router.post('/:id/plugins', async (req, res) => {
  try {
    const { id: assistantId } = req.params;
    const { plugin_id, is_enabled = true, sort_order = 0, config_override } = req.body;

    if (!plugin_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'plugin_id is required' },
        timestamp: new Date().toISOString()
      });
    }

    const db = getDatabase();

    // Check if assignment already exists
    const existing = await db.get(
      'SELECT id FROM assistant_plugins WHERE assistant_id = ? AND plugin_id = ?',
      [assistantId, plugin_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Plugin already assigned to this assistant' },
        timestamp: new Date().toISOString()
      });
    }

    // Create assignment
    const assignmentId = `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(
      `INSERT INTO assistant_plugins (id, assistant_id, plugin_id, is_enabled, sort_order, config_override, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        assistantId,
        plugin_id,
        is_enabled ? 1 : 0,
        sort_order,
        config_override ? JSON.stringify(config_override) : null,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // Fetch the created assignment with plugin details
    const newAssignment = await db.get(
      `SELECT ap.*, p.name, p.display_name, p.description, p.plugin_type, p.is_active as plugin_is_active
       FROM assistant_plugins ap
       JOIN plugins p ON ap.plugin_id = p.id
       WHERE ap.id = ?`,
      [assignmentId]
    );

    const formattedAssignment = {
      id: newAssignment.id,
      assistant_id: newAssignment.assistant_id,
      plugin_id: newAssignment.plugin_id,
      is_enabled: Boolean(newAssignment.is_enabled),
      sort_order: newAssignment.sort_order,
      config_override: newAssignment.config_override ? JSON.parse(newAssignment.config_override) : null,
      created_at: newAssignment.created_at,
      updated_at: newAssignment.updated_at,
      plugin: {
        name: newAssignment.name,
        display_name: newAssignment.display_name,
        description: newAssignment.description,
        plugin_type: newAssignment.plugin_type,
        is_active: Boolean(newAssignment.plugin_is_active)
      }
    };

    console.log(`✅ Plugin ${plugin_id} assigned to assistant ${assistantId}`);

    return res.status(201).json({
      success: true,
      data: formattedAssignment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error assigning plugin to assistant:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to assign plugin to assistant' },
      timestamp: new Date().toISOString()
    });
  }
});

// Update an assistant plugin assignment
router.put('/:id/plugins/:pluginId', async (req, res) => {
  try {
    const { id: assistantId, pluginId } = req.params;
    const { is_enabled, sort_order, config_override } = req.body;

    const db = getDatabase();

    // Check if assignment exists
    const existing = await db.get(
      'SELECT id FROM assistant_plugins WHERE assistant_id = ? AND plugin_id = ?',
      [assistantId, pluginId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Plugin assignment not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (is_enabled !== undefined) {
      updateFields.push('is_enabled = ?');
      updateValues.push(is_enabled ? 1 : 0);
    }

    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(sort_order);
    }

    if (config_override !== undefined) {
      updateFields.push('config_override = ?');
      updateValues.push(config_override ? JSON.stringify(config_override) : null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
        timestamp: new Date().toISOString()
      });
    }

    updateFields.push('updated_at = datetime(\'now\')');
    updateValues.push(assistantId, pluginId);

    await db.run(
      `UPDATE assistant_plugins SET ${updateFields.join(', ')} WHERE assistant_id = ? AND plugin_id = ?`,
      updateValues
    );

    // Fetch updated assignment
    const updated = await db.get(
      `SELECT ap.*, p.name, p.display_name, p.description, p.plugin_type, p.is_active as plugin_is_active
       FROM assistant_plugins ap
       JOIN plugins p ON ap.plugin_id = p.id
       WHERE ap.assistant_id = ? AND ap.plugin_id = ?`,
      [assistantId, pluginId]
    );

    const formattedAssignment = {
      id: updated.id,
      assistant_id: updated.assistant_id,
      plugin_id: updated.plugin_id,
      is_enabled: Boolean(updated.is_enabled),
      sort_order: updated.sort_order,
      config_override: updated.config_override ? JSON.parse(updated.config_override) : null,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      plugin: {
        name: updated.name,
        display_name: updated.display_name,
        description: updated.description,
        plugin_type: updated.plugin_type,
        is_active: Boolean(updated.plugin_is_active)
      }
    };

    console.log(`✅ Plugin assignment updated: ${assistantId}/${pluginId}`);

    return res.json({
      success: true,
      data: formattedAssignment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating assistant plugin:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update assistant plugin' },
      timestamp: new Date().toISOString()
    });
  }
});

// Remove a plugin from an assistant
router.delete('/:id/plugins/:pluginId', async (req, res) => {
  try {
    const { id: assistantId, pluginId } = req.params;
    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM assistant_plugins WHERE assistant_id = ? AND plugin_id = ?',
      [assistantId, pluginId]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Plugin assignment not found' },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Plugin ${pluginId} removed from assistant ${assistantId}`);

    return res.json({
      success: true,
      message: 'Plugin removed from assistant successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error removing plugin from assistant:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to remove plugin from assistant' },
      timestamp: new Date().toISOString()
    });
  }
});
