import express from 'express';
import axios from 'axios';
import { getAssistantModel } from '../models/AssistantSQLite';

// Load environment variables first
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  dotenv.config();
}

const router = express.Router();

// Mock function to simulate conversation creation
const createConversation = async (assistantId: string): Promise<string> => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  console.log(`🗨️  Created conversation: ${conversationId} for assistant: ${assistantId}`);
  return conversationId;
};

// POST /api/conversations - Neue Unterhaltung erstellen
router.post('/', async (req, res) => {
  try {
    const { assistantId } = req.body;
    
    if (!assistantId) {
      return res.status(400).json({ error: 'Assistant ID is required' });
    }
    
    // Get assistant from SQLite database
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(assistantId);
    
    if (!assistant) {
      return res.status(404).json({ error: 'Assistant not found' });
    }
    
    // Create conversation
    const conversationId = await createConversation(assistantId);
    
    return res.json({
      success: true,
      conversation: {
        id: conversationId,
        assistantId,
        assistantName: assistant.name,
        title: `Conversation with ${assistant.name}`,
        created: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// POST /api/conversations/:conversationId/messages - Nachricht senden
router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, assistantId } = req.body;
    
    if (!message || !assistantId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Message and assistant ID are required' },
        timestamp: new Date().toISOString()
      });
    }
    
    // Get assistant from SQLite database
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(assistantId);
    
    if (!assistant) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`🤖 Using assistant: ${assistant.name} (${assistantId})`);
    console.log(`🔗 API URL: ${assistant.api_url}`);
    console.log(`🔑 Using JWT token: ${assistant.jwt_token ? assistant.jwt_token.substring(0, 10) + '...' : 'None'}`);
    
    // Debug: Log the request being sent
    const requestData = {
      model: assistant.model_name || assistant.name.toLowerCase().replace(/\s+/g, '-'),
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: false
    };
    
    console.log(`🔧 Request for ${assistantId} model:`, JSON.stringify(requestData, null, 2));
    
    try {
      // Make request to AssistantOS
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (assistant.jwt_token) {
        headers['Authorization'] = `Bearer ${assistant.jwt_token}`;
      }
      
      const response = await axios.post(
        `${assistant.api_url}/api/chat/completions`,
        requestData,
        {
          headers,
          timeout: 30000
        }
      );
      
      const aiResponse = response.data as any;
      
      return res.json({
        success: true,
        data: {
          response: aiResponse.choices?.[0]?.message?.content || 'No response from AI',
          conversationId,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          assistantId,
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (apiError: any) {
      console.error('API Error:', apiError.response?.data || apiError.message);
      
      if (apiError.response?.status === 401) {
        return res.status(401).json({ 
          success: false, 
          error: { message: 'Authentication failed with AI service' },
          timestamp: new Date().toISOString()
        });
      } else if (apiError.response?.status === 404) {
        return res.status(404).json({ 
          success: false, 
          error: { message: 'AI service endpoint not found' },
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(500).json({ 
          success: false,
          error: { 
            message: 'AI service error',
            details: apiError.response?.data || apiError.message
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to send message' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
