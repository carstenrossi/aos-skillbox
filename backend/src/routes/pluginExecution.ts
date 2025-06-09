import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getChatPluginIntegration, ChatMessage } from '../services/chatPluginIntegration';
import { getPluginExecutor } from '../services/pluginExecutor';
import { getFunctionCallDetector, ChatContext } from '../services/functionCallDetector';
import { PluginEvent } from '../models/Plugin';
import { JWTPayload } from '../types';
import { getUserModel } from '../models/UserSQLite';
import { logger } from '../utils/logger';

const router = express.Router();
const chatPluginIntegration = getChatPluginIntegration();
const pluginExecutor = getPluginExecutor();
const functionCallDetector = getFunctionCallDetector();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Simple authentication helper for plugin routes
 */
const authenticateUser = async (req: Request): Promise<{ userId: string; username: string; role: string } | null> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Check if user still exists and is active
    const user = await getUserModel().findById(decoded.userId);
    if (!user || !user.is_active) {
      return null;
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role
    };
  } catch (error) {
    logger.error('Authentication error:', error);
    return null;
  }
};

/**
 * POST /api/plugin-execution/process-message
 * Process a chat message for plugin function calls
 */
router.post('/process-message', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { message, enableExecution = true } = req.body;
    const userId = user.userId;

    if (!message || !userId) {
      return res.status(400).json({ 
        error: 'Message and user authentication required' 
      });
    }

    // Create chat message object
    const chatMessage: ChatMessage = {
      id: message.id || `msg_${Date.now()}`,
      content: message.content,
      role: message.role || 'user',
      timestamp: message.timestamp || new Date().toISOString(),
      userId: userId,
      assistantId: message.assistantId,
      conversationId: message.conversationId,
      metadata: message.metadata
    };

    if (enableExecution) {
      // Full processing with execution
      const events: PluginEvent[] = [];
      
      const result = await chatPluginIntegration.processMessage(
        chatMessage,
        async (event: PluginEvent) => {
          events.push(event);
          // In a real-time system, you'd emit this via WebSocket
          logger.debug('Plugin event:', event);
        }
      );

      return res.json({
        success: true,
        data: {
          ...result,
          events
        }
      });
    } else {
      // Preview mode - just detect function calls without executing
      const functionCalls = await chatPluginIntegration.previewFunctionCalls(chatMessage);
      
      return res.json({
        success: true,
        data: {
          originalMessage: chatMessage,
          functionCalls,
          preview: true
        }
      });
    }

  } catch (error) {
    logger.error('Error processing message:', error);
    return res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/plugin-execution/execute
 * Execute a specific plugin function directly
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { 
      pluginId, 
      functionName, 
      parameters = {}, 
      assistantId, 
      conversationId 
    } = req.body;
    const userId = user.userId;

    if (!pluginId || !functionName || !userId) {
      return res.status(400).json({ 
        error: 'Plugin ID, function name, and user authentication required' 
      });
    }

    const events: PluginEvent[] = [];
    
    const result = await pluginExecutor.executePlugin({
      pluginId,
      functionName,
      parameters,
      userId,
      assistantId,
      conversationId,
      eventEmitter: async (event: PluginEvent) => {
        events.push(event);
        logger.debug('Plugin execution event:', event);
      }
    });

    return res.json({
      success: true,
      data: {
        ...result,
        events
      }
    });

  } catch (error) {
    logger.error('Error executing plugin:', error);
    return res.status(500).json({ 
      error: 'Failed to execute plugin',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/plugin-execution/detect-functions
 * Detect function calls in a message without executing them
 */
router.post('/detect-functions', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const { message, assistantId, conversationId } = req.body;
    const userId = user.userId;

    if (!message || !userId) {
      return res.status(400).json({ 
        error: 'Message and user authentication required' 
      });
    }

    const context: ChatContext = {
      userId,
      assistantId,
      conversationId
    };

    const functionCalls = await functionCallDetector.detectFunctionCalls(message, context);

    return res.json({
      success: true,
      data: {
        message,
        functionCalls,
        count: functionCalls.length,
        user: {
          id: userId,
          username: user.username
        }
      }
    });

  } catch (error) {
    logger.error('Error detecting function calls:', error);
    return res.status(500).json({ 
      error: 'Failed to detect function calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/plugin-execution/test
 * Test endpoint to verify plugin execution system
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    
    // Test message with plugin function call
    const testMessage = {
      content: "Generate an image of a sunset over mountains",
      role: 'user' as const,
      userId: user?.userId || 'anonymous'
    };

    const context: ChatContext = {
      userId: testMessage.userId
    };

    const functionCalls = await functionCallDetector.detectFunctionCalls(
      testMessage.content, 
      context
    );

    return res.json({
      success: true,
      data: {
        testMessage: testMessage.content,
        detectedCalls: functionCalls,
        callCount: functionCalls.length,
        pluginExecutionSystemStatus: 'operational',
        authenticated: !!user,
        user: user ? {
          id: user.userId,
          username: user.username
        } : null
      }
    });

  } catch (error) {
    logger.error('Error in plugin execution test:', error);
    return res.status(500).json({ 
      error: 'Plugin execution system test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/plugin-execution/logs
 * Get plugin execution logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // For now, return empty logs - this can be implemented later with actual log storage
    return res.json({
      success: true,
      data: {
        logs: [],
        total: 0,
        message: 'Plugin execution logs will be available in a future version'
      }
    });

  } catch (error) {
    logger.error('Error fetching plugin execution logs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch plugin execution logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as pluginExecutionRouter }; 