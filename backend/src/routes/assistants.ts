import { Router, Request, Response } from 'express';
import { assistantModel, Assistant } from '../models/Assistant';

const router = Router();

// GET /api/assistants - Liste aller Assistenten
router.get('/', async (req: Request, res: Response) => {
  try {
    const assistants = await assistantModel.findAll();
    
    // Entferne JWT Tokens aus der Antwort für Sicherheit
    const sanitizedAssistants = assistants.map(assistant => ({
      ...assistant,
      jwt_token: '***' // Verberge Token im Frontend
    }));

    res.json({
      success: true,
      assistants: sanitizedAssistants
    });
  } catch (error: any) {
    console.error('Error fetching assistants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assistants'
    });
  }
});

// GET /api/assistants/:id - Einzelner Assistent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assistant = await assistantModel.findById(id);

    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }

    // Entferne JWT Token aus der Antwort für Sicherheit
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: '***'
    };

    return res.json({
      success: true,
      assistant: sanitizedAssistant
    });
  } catch (error: any) {
    console.error('Error fetching assistant:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch assistant'
    });
  }
});

// POST /api/assistants - Neuen Assistenten erstellen
router.post('/', async (req: Request, res: Response) => {
  try {
    const assistantData = req.body;

    // Validierung
    const required = ['name', 'display_name', 'description', 'model_name', 'jwt_token'];
    for (const field of required) {
      if (!assistantData[field]) {
        return res.status(400).json({
          success: false,
          error: `Field '${field}' is required`
        });
      }
    }

    const assistant = await assistantModel.create(assistantData);

    // Entferne JWT Token aus der Antwort
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: '***'
    };

    return res.status(201).json({
      success: true,
      assistant: sanitizedAssistant
    });
  } catch (error: any) {
    console.error('Error creating assistant:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create assistant'
    });
  }
});

// PUT /api/assistants/:id - Assistenten aktualisieren
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assistant = await assistantModel.update(id, updateData);

    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }

    // Entferne JWT Token aus der Antwort
    const sanitizedAssistant = {
      ...assistant,
      jwt_token: '***'
    };

    return res.json({
      success: true,
      assistant: sanitizedAssistant
    });
  } catch (error: any) {
    console.error('Error updating assistant:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update assistant'
    });
  }
});

// DELETE /api/assistants/:id - Assistenten löschen
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await assistantModel.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }

    return res.json({
      success: true,
      message: 'Assistant deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting assistant:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete assistant'
    });
  }
});

export default router;
