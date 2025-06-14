import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getConversationModel, getMessageModel } from '../models/Conversation';
import { getAssistantModel } from '../models/AssistantSQLite';
import axios from 'axios';
import { getChatPluginIntegration, ChatMessage as PluginChatMessage } from '../services/chatPluginIntegration';

const router = express.Router();
const chatPluginIntegration = getChatPluginIntegration();

// 📊 TOKEN MANAGEMENT FUNCTIONS
/**
 * Estimates token count for text content using simple heuristic
 * @param text - Text content to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  // Heuristic: ~4 characters per token for German/English text
  return Math.ceil(text.length / 4);
}

/**
 * Selects conversation history messages within token limits
 * @param conversationHistory - Array of messages from the conversation
 * @param assistant - Assistant object with context_limit
 * @returns Array of selected messages that fit within token limits
 */
function selectConversationHistory(
  conversationHistory: any[], 
  assistant: any
): any[] {
  const contextLimit = assistant.context_limit || 32000;  // Default 32k tokens
  
  // Token reservations for various parts of the request
  const RESERVED_TOKENS = {
    system: 1200,     // System prompt + plugin definitions
    response: 4000,   // Response generation space
    buffer: 800       // Safety buffer
  };
  
  const AVAILABLE_FOR_HISTORY = contextLimit - 
    Object.values(RESERVED_TOKENS).reduce((a, b) => a + b, 0);
  
  console.log(`📊 Assistant: ${assistant.display_name}, Context: ${contextLimit}, Available for history: ${AVAILABLE_FOR_HISTORY}`);
  
  let totalTokens = 0;
  const selectedMessages: any[] = [];
  
  // Select messages backwards (newest first) to prioritize recent context
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];
    const messageTokens = estimateTokens(message.content) + 15; // +15 for message structure overhead
    
    if (totalTokens + messageTokens <= AVAILABLE_FOR_HISTORY) {
      selectedMessages.unshift(message); // Add to beginning to maintain chronological order
      totalTokens += messageTokens;
    } else {
      // Stop adding messages when we hit the limit
      break;
    }
  }
  
  // Ensure we have at least the most recent message if history exists
  if (selectedMessages.length === 0 && conversationHistory.length > 0) {
    selectedMessages.push(conversationHistory[conversationHistory.length - 1]);
    console.log(`⚠️ Only including most recent message due to token constraints`);
  }
  
  console.log(`✅ Selected ${selectedMessages.length}/${conversationHistory.length} messages (~${totalTokens} tokens)`);
  return selectedMessages;
}

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
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Content is required' },
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

    // Get assistant from conversation
    const assistantModel = getAssistantModel();
    const assistant = await assistantModel.findById(conversation.assistant_id);

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
      content: content
    });

    // 🔥 PLUGIN INTEGRATION: Check for function calls in user message
    const pluginMessage: PluginChatMessage = {
      id: userMessage.id,
      content: content,
      role: 'user',
      timestamp: typeof userMessage.created_at === 'string' ? userMessage.created_at : userMessage.created_at.toISOString(),
      userId: userId,
      assistantId: assistant.id,
      conversationId: id
    };

    let pluginResult: any = null;
    let pluginEvents: any[] = [];

    try {
      // Process message for plugin function calls
      const result = await chatPluginIntegration.processMessage(
        pluginMessage,
        async (event) => {
          pluginEvents.push(event);
        }
      );
      pluginResult = result;

      // If plugins were executed, handle their results
      if (pluginResult && pluginResult.functionCalls && pluginResult.functionCalls.length > 0) {
        console.log(`🎯 Executed ${pluginResult.functionCalls.length} plugin function(s)`);
        
        // Check if any plugins were successfully executed
        const successfulResults = pluginResult.pluginResults ? pluginResult.pluginResults.filter((result: any) => result.success) : [];

        if (successfulResults.length > 0) {
          // Create assistant message with plugin results
          let assistantContent = '';
          
          // Extract message events from plugin events
          const messageEvents = pluginEvents.filter(event => event.type === 'message');
          if (messageEvents.length > 0) {
            // Use the content from message events (formatted plugin output)
            assistantContent = messageEvents.map(event => event.data.content).join('\n\n');
          } else {
            // Fallback to processed message content
            assistantContent = pluginResult.processedMessage ? pluginResult.processedMessage.content : 'Plugin-Ausführung abgeschlossen';
          }
          
          // Add plugin execution summaries if no message events
          if (messageEvents.length === 0 && pluginResult.pluginResults) {
            pluginResult.pluginResults.forEach((result: any) => {
              if (result.success) {
                assistantContent += `\n\n✅ **${result.pluginName}**: ${result.resultSummary || 'Erfolgreich ausgeführt'}`;
              } else {
                assistantContent += `\n\n❌ **${result.pluginName}**: ${result.error || 'Fehler bei der Ausführung'}`;
              }
            });
          }

          const assistantMessage = await messageModel.create({
            conversation_id: id,
            role: 'assistant',
            content: assistantContent,
            metadata: {
              plugin_execution: true,
              function_calls: pluginResult.functionCalls || [],
              plugin_results: pluginResult.pluginResults || [],
              events: pluginEvents
            }
          });

          return res.json({
            success: true,
            data: {
              message: {
                id: assistantMessage.id,
                content: assistantContent,
                role: 'assistant',
                timestamp: assistantMessage.created_at
              },
              conversation: {
                id: id,
                title: conversation.title
              },
              plugin_execution: {
                executed: true,
                function_calls: pluginResult.functionCalls || [],
                results: pluginResult.pluginResults || [],
                events: pluginEvents
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (pluginError) {
      console.error('Plugin processing error:', pluginError);
      // Continue with normal AI processing if plugins fail
    }

    // 🤖 NORMAL AI PROCESSING: Continue with regular assistant response if no plugins executed
    console.log(`🤖 Using assistant: ${assistant.display_name} (${assistant.id})`);
    console.log(`🔗 API URL: ${assistant.api_url}`);
    console.log(`🔑 Using JWT token: ${assistant.jwt_token ? assistant.jwt_token.substring(0, 10) + '...' : 'None'}`);
    
    // 🔌 GET AVAILABLE PLUGINS and build enhanced system prompt
    let enhancedSystemPrompt = assistant.system_prompt || 'Du bist ein hilfreicher KI-Assistant. Antworte höflich und professionell auf Deutsch.';
    
    try {
      const { getDatabase } = await import('../database/database');
      const db = getDatabase();
      
      const assignedPlugins = await db.all(
        `SELECT ap.*, p.name, p.display_name, p.description, p.plugin_type, p.manifest
         FROM assistant_plugins ap
         JOIN plugins p ON ap.plugin_id = p.id
         WHERE ap.assistant_id = ? AND ap.is_enabled = 1 AND p.is_active = 1`,
        [assistant.id]
      );
      
      if (assignedPlugins.length > 0) {
        console.log(`🔌 Found ${assignedPlugins.length} active plugins for assistant`);
        
        // Build function definitions for the AI
        const functionDefinitions = assignedPlugins.map(plugin => {
          try {
            const manifest = JSON.parse(plugin.manifest);
            const functions = manifest.functions || [];
            return functions.map((func: any) => ({
              name: `${plugin.name}.${func.name}`,
              description: func.description,
              parameters: func.parameters
            }));
          } catch (e) {
            console.error(`Failed to parse manifest for plugin ${plugin.name}:`, e);
            return [];
          }
        }).flat();
        
        if (functionDefinitions.length > 0) {
          enhancedSystemPrompt += `\n\n🔌 VERFÜGBARE FUNKTIONEN:\nDu hast Zugriff auf folgende Funktionen:\n\n`;
          
          functionDefinitions.forEach(func => {
            enhancedSystemPrompt += `**${func.name}**: ${func.description}\n`;
            if (func.parameters?.properties) {
              const params = Object.keys(func.parameters.properties).map(key => 
                `${key}: ${func.parameters.properties[key].description || func.parameters.properties[key].type}`
              ).join(', ');
              enhancedSystemPrompt += `Parameter: ${params}\n`;
            }
            enhancedSystemPrompt += '\n';
          });
          
          enhancedSystemPrompt += `WICHTIG: Wenn ein Benutzer nach einer Funktion fragt, die du bereitstellen kannst (z.B. Bildgenerierung), antworte mit einem FUNCTION_CALL in folgendem Format:

FUNCTION_CALL: function_name(parameter1="wert1", parameter2="wert2")

Beispiele:
- Für Bildgenerierung: FUNCTION_CALL: flux_image_generator.image_gen(prompt="ein futuristischer Roboter")
- Für Text-to-Speech: FUNCTION_CALL: elevenlabs_tts.generate_speech(text="Hallo Welt", voice_id="Rachel")

Wenn der Benutzer etwas anderes fragt, antworte normal.`;
        }
      }
    } catch (pluginError) {
      console.error('Error loading plugins for system prompt:', pluginError);
    }
    
    // 📚 LOAD CONVERSATION HISTORY
    console.log(`📚 Loading conversation history for conversation: ${id}`);
    const conversationHistory = await messageModel.findByConversationId(id, {
      order: 'asc' // Chronological order (oldest first)
    });
    
    // Exclude the current user message we just created (it would be the last one)
    const historyWithoutCurrentMessage = conversationHistory.filter(msg => msg.id !== userMessage.id);
    
    // Select appropriate history based on token limits
    const selectedHistory = selectConversationHistory(historyWithoutCurrentMessage, assistant);
    
    // Convert messages to OpenAI format
    const historyMessages = selectedHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log(`📖 Including ${historyMessages.length} history messages in context`);

    // Prepare AI request
    const requestData = {
      model: assistant.model_name || assistant.name.toLowerCase().replace(/\s+/g, '-'),
      messages: [
        {
          role: 'system',
          content: enhancedSystemPrompt
        },
        ...historyMessages,  // 🆕 Include conversation history
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 8192,
      temperature: 0.7,
      stream: false
    };
    
    console.log(`🔧 Request for ${assistant.id}:`, JSON.stringify(requestData, null, 2));
    
    const maxRetries = 3;
    const retryDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
        const assistantResponseContent = aiResponse.choices?.[0]?.message?.content || 'Keine Antwort erhalten.';
        
        console.log(`✅ AI Response received (attempt ${attempt}):`, assistantResponseContent.substring(0, 100) + '...');
        
        // 🔍 CHECK FOR FUNCTION CALLS in AI response
        const functionCallMatch = assistantResponseContent.match(/FUNCTION_CALL:\s*([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
        
        if (functionCallMatch) {
          console.log(`🎯 AI requested function call: ${functionCallMatch[1]}`);
          
          try {
            // Parse function call
            const [pluginName, functionName] = functionCallMatch[1].split('.');
            const parametersStr = functionCallMatch[2];
            
            // Parse parameters (simple key="value" parsing)
            const parameters: any = {};
            const paramMatches = parametersStr.matchAll(/(\w+)=["']([^"']+)["']/g);
            for (const match of paramMatches) {
              parameters[match[1]] = match[2];
            }
            
            console.log(`🔧 Executing ${pluginName}.${functionName} with:`, parameters);
            
            // Find plugin by name
            const { getPluginModel } = await import('../models/PluginSQLite');
            const pluginModel = getPluginModel();
            const plugin = await pluginModel.findByName(pluginName);
            
            if (!plugin) {
              throw new Error(`Plugin ${pluginName} not found`);
            }
            
            // Execute plugin function
            const { getPluginExecutor } = await import('../services/pluginExecutor');
            const pluginExecutor = getPluginExecutor();
            
            const pluginExecResult = await pluginExecutor.executeFunction(plugin.id, functionName, parameters, {
              userId: userId,
              assistantId: assistant.id,
              conversationId: id
            });
            
            if (pluginExecResult.success) {
              // Build proper content with plugin results
              let resultContent = '';
              
              // Check for image URL in multiple possible locations
              const imageUrl = pluginExecResult.data?.image_url || 
                              pluginExecResult.data?.data?.image_url ||
                              (pluginExecResult.data?.images && pluginExecResult.data.images[0]?.url);
              
              if (imageUrl) {
                // Image generation result - Frontend extracts images automatically
                const meta = pluginExecResult.data?.metadata || pluginExecResult.data?.data?.metadata;
                if (meta) {
                  resultContent = `**Details:**\n`;
                  if (meta.width && meta.height) resultContent += `📏 Größe: ${meta.width}×${meta.height}\n`;
                  if (meta.seed) resultContent += `🎲 Seed: ${meta.seed}\n`;
                  if (meta.model) resultContent += `🤖 Model: ${meta.model}\n`;
                  if (meta.provider) resultContent += `⚡ Provider: ${meta.provider}\n`;
                } else {
                  resultContent = `Bild wurde erfolgreich generiert.`;
                }
                
                // Add image URL in markdown format for frontend extraction
                resultContent += `\n\n![Generated Image](${imageUrl})`;
              } else if (pluginExecResult.data && (pluginExecResult.data.audio_url || pluginExecResult.data.data?.audio_url)) {
                // Audio generation result
                const audioUrl = pluginExecResult.data.audio_url || pluginExecResult.data.data?.audio_url;
                console.log('🎵 Audio URL detected:', audioUrl?.substring(0, 50) + '...');
                resultContent = `🎵 **Audio erfolgreich generiert!**\n\n[Audio anhören](${audioUrl})`;
              } else if (pluginName === 'google_keyword_generator' && pluginExecResult.data) {
                // Keyword generation result
                console.log('🔍 Keyword generation result:', pluginExecResult.data);
                let keywords = pluginExecResult.data.keywords || pluginExecResult.data.data?.keywords || [];
                
                // Fix UTF-8 encoding issues for German umlauts
                keywords = keywords.map((keyword: string) => {
                  let fixed = keyword;
                  
                  // Fix specific broken characters
                  fixed = fixed.replace(/zitronens�ure/g, 'zitronensäure');
                  fixed = fixed.replace(/s�ure/g, 'säure');
                  
                  // German UTF-8 fixes
                  fixed = fixed.replace(/Ã¤/g, 'ä');
                  fixed = fixed.replace(/Ã¶/g, 'ö');
                  fixed = fixed.replace(/Ã¼/g, 'ü');
                  fixed = fixed.replace(/ÃŸ/g, 'ß');
                  fixed = fixed.replace(/Ã„/g, 'Ä');
                  fixed = fixed.replace(/Ã–/g, 'Ö');
                  fixed = fixed.replace(/Ãœ/g, 'Ü');
                  
                  // French UTF-8 fixes
                  fixed = fixed.replace(/Ã©/g, 'é');
                  fixed = fixed.replace(/Ã¨/g, 'è');
                  fixed = fixed.replace(/Ãª/g, 'ê');
                  fixed = fixed.replace(/Ã«/g, 'ë');
                  fixed = fixed.replace(/Ã§/g, 'ç');
                  fixed = fixed.replace(/Ã /g, 'à');
                  fixed = fixed.replace(/Ã¢/g, 'â');
                  fixed = fixed.replace(/Ã´/g, 'ô');
                  fixed = fixed.replace(/Ã®/g, 'î');
                  fixed = fixed.replace(/Ã¯/g, 'ï');
                  fixed = fixed.replace(/Ã¹/g, 'ù');
                  fixed = fixed.replace(/Ã»/g, 'û');
                  fixed = fixed.replace(/Ã¼/g, 'ü');
                  fixed = fixed.replace(/Ã¿/g, 'ÿ');
                  
                  // Spanish UTF-8 fixes
                  fixed = fixed.replace(/Ã±/g, 'ñ');
                  fixed = fixed.replace(/Ã¡/g, 'á');
                  fixed = fixed.replace(/Ã­/g, 'í');
                  fixed = fixed.replace(/Ã³/g, 'ó');
                  fixed = fixed.replace(/Ãº/g, 'ú');
                  fixed = fixed.replace(/Ã‰/g, 'É');
                  fixed = fixed.replace(/Ã/g, 'Ñ');
                  
                  // Italian UTF-8 fixes
                  fixed = fixed.replace(/Ã /g, 'à');
                  fixed = fixed.replace(/Ã¬/g, 'ì');
                  fixed = fixed.replace(/Ã²/g, 'ò');
                  
                  // Portuguese UTF-8 fixes
                  fixed = fixed.replace(/Ã£/g, 'ã');
                  fixed = fixed.replace(/Ãµ/g, 'õ');
                  fixed = fixed.replace(/Ã§/g, 'ç');
                  
                  // Scandinavian UTF-8 fixes (Norwegian, Swedish, Danish)
                  fixed = fixed.replace(/Ã¥/g, 'å');
                  fixed = fixed.replace(/Ã¦/g, 'æ');
                  fixed = fixed.replace(/Ã¸/g, 'ø');
                  fixed = fixed.replace(/Ã…/g, 'Å');
                  fixed = fixed.replace(/Ã†/g, 'Æ');
                  fixed = fixed.replace(/Ã˜/g, 'Ø');
                  
                  // Polish UTF-8 fixes
                  fixed = fixed.replace(/Ä…/g, 'ą');
                  fixed = fixed.replace(/Ä‡/g, 'ć');
                  fixed = fixed.replace(/Ä™/g, 'ę');
                  fixed = fixed.replace(/Å‚/g, 'ł');
                  fixed = fixed.replace(/Å„/g, 'ń');
                  fixed = fixed.replace(/Ã³/g, 'ó');
                  fixed = fixed.replace(/Å›/g, 'ś');
                  fixed = fixed.replace(/Åº/g, 'ź');
                  fixed = fixed.replace(/Å¼/g, 'ż');
                  
                  // Czech UTF-8 fixes
                  fixed = fixed.replace(/Ä/g, 'č');
                  fixed = fixed.replace(/Ä/g, 'ď');
                  fixed = fixed.replace(/Ä›/g, 'ě');
                  fixed = fixed.replace(/Å/g, 'ň');
                  fixed = fixed.replace(/Å™/g, 'ř');
                  fixed = fixed.replace(/Å¡/g, 'š');
                  fixed = fixed.replace(/Å¥/g, 'ť');
                  fixed = fixed.replace(/Å¯/g, 'ů');
                  fixed = fixed.replace(/Å¾/g, 'ž');
                  
                  // Dutch UTF-8 fixes
                  fixed = fixed.replace(/Ã«/g, 'ë');
                  fixed = fixed.replace(/Ã¯/g, 'ï');
                  
                  // General replacement for any remaining � characters
                  fixed = fixed.replace(/�/g, '');
                  
                  return fixed;
                });
                
                if (keywords && keywords.length > 0) {
                  resultContent = `🔍 **Keywords für "${parameters.keyword || parameters.seed_keyword || parameters.query}":**\n\n`;
                  keywords.forEach((keyword: string, index: number) => {
                    resultContent += `${index + 1}. ${keyword}\n`;
                  });
                  resultContent += `\n💡 **SEO-Tipp:** Verwende diese Keywords in deinen Blog-Titeln, Meta-Beschreibungen und im Content für bessere Suchmaschinen-Rankings!`;
                } else {
                  resultContent = `🔍 **Keyword-Recherche abgeschlossen**, aber keine Keywords gefunden. Versuche es mit einem anderen Suchbegriff.`;
                }
              } else if (pluginExecResult.data && pluginExecResult.data.success) {
                // Generic success result
                console.log('🔧 Generic success result for plugin:', pluginName, 'data keys:', Object.keys(pluginExecResult.data));
                resultContent = `✅ **${pluginName} erfolgreich ausgeführt!**\n\n${pluginExecResult.data.message || 'Operation abgeschlossen.'}`;
              } else {
                // Fallback
                resultContent = `✅ **${pluginName}.${functionName} erfolgreich ausgeführt!**`;
              }

              // Save assistant message with plugin results
              const assistantMessage = await messageModel.create({
                conversation_id: id,
                role: 'assistant',
                content: resultContent,
                metadata: {
                  ai_response: true,
                  model: requestData.model,
                  attempt: attempt,
                  function_call: {
                    function: functionCallMatch[1],
                    parameters: parameters,
                    executed: true
                  },
                  plugin_result: pluginExecResult.data
                }
              });

              // Return with plugin results
              return res.json({
                success: true,
                data: {
                  message: {
                    id: assistantMessage.id,
                    content: assistantMessage.content,
                    role: 'assistant',
                    timestamp: assistantMessage.created_at
                  },
                  conversation: {
                    id: id,
                    title: conversation.title
                  },
                  plugin_execution: {
                    executed: true,
                    function_calls: [pluginExecResult.data],
                    results: pluginExecResult.data ? [pluginExecResult.data] : [],
                    events: pluginExecResult.events || []
                  }
                },
                timestamp: new Date().toISOString()
              });
            }
          } catch (funcError) {
            console.error('Function execution error:', funcError);
            // Continue with normal response if function fails
          }
        }
        
        // Save assistant message (normal response or failed function call)
        const assistantMessage = await messageModel.create({
          conversation_id: id,
          role: 'assistant',
          content: assistantResponseContent,
          metadata: {
            ai_response: true,
            model: requestData.model,
            attempt: attempt
          }
        });

        return res.json({
          success: true,
          data: {
            message: {
              id: assistantMessage.id,
              content: assistantResponseContent,
              role: 'assistant',
              timestamp: assistantMessage.created_at
            },
            conversation: {
              id: id,
              title: conversation.title
            }
          },
          timestamp: new Date().toISOString()
        });

      } catch (apiError: any) {
        console.error(`API Error (attempt ${attempt}):`, apiError.response?.data || apiError.message);
        
        if (attempt === maxRetries) {
          // This is the final attempt
          throw apiError;
        } else {
          console.log(`Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error('Max retries exceeded');

  } catch (error: any) {
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