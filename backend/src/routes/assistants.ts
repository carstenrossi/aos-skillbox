import express from 'express';
import { getAssistantModel } from '../models/AssistantSQLite';

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
      system_prompt: system_prompt || 'Du bist ein hilfreicher KI-Assistant. Antworte höflich und professionell auf Deutsch.',
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
