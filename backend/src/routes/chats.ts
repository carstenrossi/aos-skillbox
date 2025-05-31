import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import axios from 'axios';
import { assistantModel, Assistant } from '../models/Assistant';

// Load environment variables first
dotenv.config();

const router = Router();

// AssistantOS Configuration
const ASSISTANT_OS_API_URL = process.env.ASSISTANT_OS_API_URL || 'https://kr.assistantos.de';
const ASSISTANT_OS_API_KEY = process.env.ASSISTANT_OS_API_KEY;

// Security check: Ensure API key is provided via environment variable (als Fallback)
if (!ASSISTANT_OS_API_KEY) {
  console.warn('⚠️  WARNING: ASSISTANT_OS_API_KEY environment variable not set. Using assistant-specific tokens only.');
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[];
  conversationId?: string;
}

interface ChatRequest {
  message: string;
  assistantId: string;
  conversationId?: string;
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

interface ConversationRequest {
  assistantId: string;
  title?: string;
}

// Get all conversations
router.get('/', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${ASSISTANT_OS_API_URL}/conversations`, {
      headers: {
        'Authorization': `Bearer ${ASSISTANT_OS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    res.json({
      success: true,
      conversations: (response.data as any)?.conversations || [],
    });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      details: error?.response?.data || error?.message || String(error),
    });
  }
});

// Create new conversation (simplified for OpenAI-compatible API)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { assistantId, title }: ConversationRequest = req.body;

    if (!assistantId) {
      return res.status(400).json({
        success: false,
        error: 'Assistant ID is required',
      });
    }

    // For OpenAI-compatible API, we'll create a simple conversation object
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return res.json({
      success: true,
      conversation: {
        id: conversationId,
        assistantId,
        title: title || `Conversation with Assistant ${assistantId}`,
        created: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      details: error?.response?.data || error?.message || String(error),
    });
  }
});

// Get conversation messages
router.get('/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const response = await axios.get(`${ASSISTANT_OS_API_URL}/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${ASSISTANT_OS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    res.json({
      success: true,
      messages: (response.data as any)?.messages || [],
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      details: error?.response?.data || error?.message || String(error),
    });
  }
});

// Send message using OpenAI-compatible chat completions endpoint
router.post('/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { message, assistantType, model, files }: { 
      message: string; 
      assistantType?: string; 
      model?: string;
      files?: any[] 
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Finde den Assistenten basierend auf assistantType (oder verwende assistantType als ID)
    let assistant: Assistant | null = null;
    if (assistantType) {
      // Versuche zuerst nach ID, dann nach Name
      assistant = await assistantModel.findById(assistantType) || 
                  await assistantModel.findByName(assistantType);
    }

    // Fallback auf den ersten aktiven Assistenten, wenn nichts gefunden wurde
    if (!assistant) {
      const activeAssistants = await assistantModel.findAllActive();
      if (activeAssistants.length > 0) {
        assistant = activeAssistants[0];
        console.log(`🔄 Using fallback assistant: ${assistant.name}`);
      }
    }

    // Determine model and get JWT token from assistant
    let modelName = model || 'gpt-4';
    let jwtToken = ASSISTANT_OS_API_KEY || '';
    let apiUrl = ASSISTANT_OS_API_URL;

    if (assistant) {
      modelName = model || assistant.model_name;
      jwtToken = assistant.jwt_token || ASSISTANT_OS_API_KEY || '';
      apiUrl = assistant.api_url || ASSISTANT_OS_API_URL;
      
      console.log(`🤖 Using assistant: ${assistant.display_name} (${assistant.name})`);
      console.log(`🔗 API URL: ${apiUrl}`);
      console.log(`🔑 Using JWT token: ${jwtToken ? '***' + jwtToken.slice(-4) : 'NOT CONFIGURED'}`);
    } else {
      console.warn('⚠️  No assistant configuration found, using defaults');
    }

    if (!jwtToken) {
      return res.status(500).json({
        success: false,
        error: 'JWT Token not configured for this assistant',
        details: 'Please configure a JWT token for this assistant in the admin panel'
      });
    }

    // Map legacy assistant types for backward compatibility
    switch(assistantType) {
      case 'narrative':
        modelName = model || 'narrative-coach';
        break;
      case 'csrd':
        modelName = model || 'csrd-coach';
        break;
      case 'adoption':
        modelName = model || 'adoption-coach';
        break;
    }

    // Send only user message - system prompts are configured in AssistantOS
    const apiMessages = [
      {
        role: 'user',
        content: message,
      }
    ];

    const requestData = {
      model: modelName,
      messages: apiMessages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: false,
    };

    console.log(`🔧 Request for ${assistantType} model:`, JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${apiUrl}/api/chat/completions`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const aiResponse = (response.data as any).choices?.[0]?.message?.content || 'Entschuldigung, ich konnte keine Antwort generieren.';

    return res.json({
      success: true,
      message: {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        conversationId,
        model: modelName,
        assistantType,
      },
      conversationId,
    });

  } catch (error: any) {
    console.error('Error sending message:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error?.response?.data || error?.message || String(error),
    });
  }
});

// Non-streaming message endpoint for fallback
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { message, assistantId, conversationId, files }: ChatRequest = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (!assistantId) {
      return res.status(400).json({
        success: false,
        error: 'Assistant ID is required',
      });
    }

    // If no conversation ID, create a new conversation
    let targetConversationId = conversationId;
    if (!targetConversationId) {
      try {
        const convResponse = await axios.post(`${ASSISTANT_OS_API_URL}/conversations`, {
          assistantId,
          title: `Chat ${new Date().toISOString()}`,
        }, {
          headers: {
            'Authorization': `Bearer ${ASSISTANT_OS_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });
        targetConversationId = (convResponse.data as any)?.id;
      } catch (convError) {
        console.error('Error creating conversation:', convError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create conversation',
        });
      }
    }

    const requestData = {
      message,
      files: files || [],
      stream: false,
    };

    const response = await axios.post(
      `${ASSISTANT_OS_API_URL}/conversations/${targetConversationId}/messages`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${ASSISTANT_OS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return res.json({
      success: true,
      message: response.data,
      conversationId: targetConversationId,
    });

  } catch (error: any) {
    console.error('Error sending message:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send message',
        details: error?.response?.data || error?.message || String(error),
      });
    }
    return; // Add return for case where headers are already sent
  }
});

// Health check for chat service
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Chat API',
    timestamp: new Date().toISOString(),
    assistantOsConnected: !!ASSISTANT_OS_API_KEY,
  });
});

export default router;
