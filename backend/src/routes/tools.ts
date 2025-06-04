import express from 'express';
import { ToolModel, CreateToolRequest, UpdateToolRequest } from '../models/ToolModel';
import { connectDatabase } from '../database/database';

const router = express.Router();

// Hilfsfunktion um die Datenbank und ToolModel zu initialisieren
const getToolModel = async (): Promise<ToolModel> => {
  const database = await connectDatabase();
  if (!database.instance) {
    throw new Error('Database connection not available');
  }
  return new ToolModel(database.instance);
};

/**
 * GET /api/tools
 * Alle aktiven Tools für Frontend abrufen (öffentlich zugänglich)
 */
router.get('/', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const activeTools = await toolModel.getActiveTools();
    return res.json({
      success: true,
      data: activeTools,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch tools' },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/tools/admin
 * Alle Tools für Admin-Panel abrufen (auch inaktive)
 * TODO: Authentifizierung hinzufügen
 */
router.get('/admin', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const allTools = await toolModel.getAllTools();
    return res.json(allTools);
  } catch (error) {
    console.error('Error fetching admin tools:', error);
    return res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

/**
 * POST /api/tools/admin
 * Neues Tool erstellen (Admin only)
 */
router.post('/admin', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const toolData: CreateToolRequest = req.body;
    const createdBy = (req as any).user?.id || 'unknown'; // TODO: Echte User-ID verwenden
    
    const newTool = await toolModel.createTool(toolData, createdBy);
    return res.status(201).json({
      success: true,
      data: newTool,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating tool:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create tool' },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/tools/admin/:id
 * Tool aktualisieren (Admin only)
 */
router.put('/admin/:id', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const toolId = parseInt(req.params.id);
    const toolData: UpdateToolRequest = req.body;
    const updatedBy = (req as any).user?.id || 'unknown'; // TODO: Echte User-ID verwenden
    
    const updatedTool = await toolModel.updateTool(toolId, toolData, updatedBy);
    
    if (!updatedTool) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Tool not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({
      success: true,
      data: updatedTool,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to update tool' },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/tools/admin/:id
 * Tool löschen (Admin only)
 */
router.delete('/admin/:id', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const toolId = parseInt(req.params.id);
    
    const deleted = await toolModel.deleteTool(toolId);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Tool not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Tool successfully deleted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting tool:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to delete tool' },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/tools/admin/reorder
 * Sortierung der Tools aktualisieren (Admin only)
 */
router.put('/admin/reorder', async (req, res) => {
  try {
    const toolModel = await getToolModel();
    const { toolIds }: { toolIds: number[] } = req.body;
    
    const success = await toolModel.updateToolsOrder(toolIds);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to reorder tools' });
    }
    
    return res.json({ message: 'Tools successfully reordered' });
  } catch (error) {
    console.error('Error reordering tools:', error);
    return res.status(500).json({ error: 'Failed to reorder tools' });
  }
});

export { router as toolsRouter }; 