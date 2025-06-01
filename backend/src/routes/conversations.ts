import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getConversationModel, getMessageModel } from '../models/Conversation';
import { getAssistantModel } from '../models/AssistantSQLite';
import axios from 'axios';

const router = express.Router();

// GET /api/conversations - Get user's conversations
router.get('/', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const conversationModel = getConversationModel();
    const { assistant_id, limit = 20, offset = 0 } = req.query;

    const conversations = await conversationModel.findByUserId(userId, {
      assistant_id: assistant_id as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    const total = await conversationModel.getCountByUserId(userId, assistant_id as string);

    return res.json({
      success: true,
      data: conversations,
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch conversations' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/conversations - Create new conversation
router.post('/', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { assistantId, title } = req.body;
    
    if (!assistantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Assistant ID is required' },
        timestamp: new Date().toISOString()
      });
    }

    // Verify assistant exists
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(assistantId);
    
    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Create conversation
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.create({
      user_id: userId,
      assistant_id: assistantId,
      title: title || `Conversation with ${assistant.display_name}`
    });

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        assistantId: conversation.assistant_id,
        assistantName: assistant.name,
        title: conversation.title,
        created: conversation.created_at.toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create conversation' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversations/:id - Get specific conversation
router.get('/:id', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user owns the conversation
    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      data: conversation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch conversation' },
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/conversations/:id - Update conversation
router.put('/:id', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;
    const { title, is_active } = req.body;

    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user owns the conversation
    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    const updatedConversation = await conversationModel.update(id, {
      title,
      is_active
    });

    return res.json({
      success: true,
      data: updatedConversation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating conversation:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update conversation' },
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user owns the conversation
    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    const deleted = await conversationModel.delete(id);

    if (deleted) {
      return res.json({
        success: true,
        message: 'Conversation deleted successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete conversation' },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete conversation' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/conversations/:id/messages - Get conversation messages
router.get('/:id/messages', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify conversation exists and user owns it
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    // Get messages
    const messageModel = getMessageModel();
    const messages = await messageModel.findByConversationId(id, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      order: 'asc'
    });

    const total = await messageModel.getCountByConversationId(id);

    return res.json({
      success: true,
      data: messages,
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch messages' },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/conversations/:id/messages - Send message and get AI response
router.post('/:id/messages', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;
    const { message, assistantId } = req.body;

    if (!message || !assistantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message and assistant ID are required' },
        timestamp: new Date().toISOString()
      });
    }

    // Verify conversation exists and user owns it
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    // Get assistant
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(assistantId);

    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: { message: 'Assistant not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Save user message
    const messageModel = getMessageModel();
    const userMessage = await messageModel.create({
      conversation_id: id,
      role: 'user',
      content: message
    });

    // Call AssistantOS API
    try {
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
      const assistantResponseContent = aiResponse.choices?.[0]?.message?.content || 'No response from AI';

      // Save assistant message
      const assistantMessage = await messageModel.create({
        conversation_id: id,
        role: 'assistant',
        content: assistantResponseContent,
        metadata: {
          usage: aiResponse.usage,
          model: assistant.model_name
        }
      });

      return res.json({
        response: assistantResponseContent,
        conversationId: id,
        messageId: assistantMessage.id,
        assistantId,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      console.error('AssistantOS API Error:', apiError.response?.data || apiError.message);
      
      // Save error message
      await messageModel.create({
        conversation_id: id,
        role: 'assistant',
        content: 'Es tut mir leid, ich kann momentan nicht antworten. Bitte versuchen Sie es später erneut.',
        metadata: {
          error: true,
          error_message: apiError.message
        }
      });

      if (apiError.response?.status === 401) {
        return res.status(500).json({
          success: false,
          error: { message: 'Authentication failed with AI service' },
          timestamp: new Date().toISOString()
        });
      } else if (apiError.response?.status === 404) {
        return res.status(500).json({
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

// GET /api/conversations/:id/summary - Get conversation summary (optional feature)
router.get('/:id/summary', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = (req as unknown as AuthenticatedRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'User not authenticated' } 
      });
    }

    const { id } = req.params;

    // Verify conversation exists and user owns it
    const conversationModel = getConversationModel();
    const conversation = await conversationModel.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found' },
        timestamp: new Date().toISOString()
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' },
        timestamp: new Date().toISOString()
      });
    }

    // Get basic summary info
    const messageModel = getMessageModel();
    const messageCount = await messageModel.getCountByConversationId(id);
    const recentMessages = await messageModel.findByConversationId(id, {
      limit: 5,
      order: 'desc'
    });

    return res.json({
      success: true,
      data: {
        conversation_id: id,
        title: conversation.title,
        message_count: messageCount,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        last_message_at: conversation.last_message_at,
        recent_messages: recentMessages.reverse() // Show in chronological order
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting conversation summary:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to get conversation summary' },
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 