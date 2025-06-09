import { getFunctionCallDetector, FunctionCall, ChatContext } from './functionCallDetector';
import { getPluginExecutor, PluginCallRequest } from './pluginExecutor';
import { PluginEvent } from '../models/Plugin';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  userId: string;
  assistantId?: string;
  conversationId?: string;
  metadata?: { [key: string]: any };
}

export interface PluginChatResponse {
  originalMessage: ChatMessage;
  processedMessage: ChatMessage;
  functionCalls: FunctionCall[];
  pluginResults: PluginExecutionSummary[];
  events: PluginEvent[];
}

export interface PluginExecutionSummary {
  pluginId: string;
  pluginName: string;
  functionName: string;
  success: boolean;
  executionTimeMs: number;
  error?: string;
  resultSummary?: string;
}

export class ChatPluginIntegration {
  private functionCallDetector = getFunctionCallDetector();
  private pluginExecutor = getPluginExecutor();

  /**
   * Process a chat message for plugin function calls
   */
  async processMessage(
    message: ChatMessage,
    eventCallback?: (event: PluginEvent) => Promise<void>
  ): Promise<PluginChatResponse> {
    const response: PluginChatResponse = {
      originalMessage: message,
      processedMessage: { ...message },
      functionCalls: [],
      pluginResults: [],
      events: []
    };

    try {
      // Create chat context
      const context: ChatContext = {
        userId: message.userId,
        assistantId: message.assistantId,
        conversationId: message.conversationId
      };

      // Detect function calls in the message
      const functionCalls = await this.functionCallDetector.detectFunctionCalls(message.content, context);
      response.functionCalls = functionCalls;

      if (functionCalls.length === 0) {
        logger.debug('No function calls detected in message');
        return response;
      }

      logger.info(`Processing ${functionCalls.length} function calls`);

      // Execute each function call
      const executionPromises = functionCalls.map(call => 
        this.executeFunctionCall(call, message, eventCallback)
      );

      const results = await Promise.allSettled(executionPromises);
      
      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          response.pluginResults.push(result.value);
        } else {
          logger.error(`Function call ${index} failed:`, result.reason);
          response.pluginResults.push({
            pluginId: functionCalls[index].pluginId,
            pluginName: functionCalls[index].pluginName,
            functionName: functionCalls[index].functionName,
            success: false,
            executionTimeMs: 0,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Update processed message with results
      response.processedMessage = await this.buildProcessedMessage(
        message, 
        functionCalls, 
        response.pluginResults
      );

      logger.info(`Processed message with ${response.pluginResults.length} plugin results`);

    } catch (error) {
      logger.error('Error processing message for plugins:', error);
      
      // Emit error event
      if (eventCallback) {
        await eventCallback({
          type: 'error',
          data: {
            status: 'error',
            description: 'Failed to process plugin functions',
            error: error instanceof Error ? error.message : 'Unknown error',
            done: true
          }
        });
      }
    }

    return response;
  }

  /**
   * Execute a single function call
   */
  private async executeFunctionCall(
    functionCall: FunctionCall,
    originalMessage: ChatMessage,
    eventCallback?: (event: PluginEvent) => Promise<void>
  ): Promise<PluginExecutionSummary> {
    const startTime = Date.now();

    try {
      // Prepare plugin call request
      const pluginRequest: PluginCallRequest = {
        pluginId: functionCall.pluginId,
        functionName: functionCall.functionName,
        parameters: functionCall.parameters,
        userId: originalMessage.userId,
        assistantId: originalMessage.assistantId,
        conversationId: originalMessage.conversationId,
        eventEmitter: eventCallback
      };

      // Execute the plugin
      const result = await this.pluginExecutor.executePlugin(pluginRequest);
      const executionTime = Date.now() - startTime;

      return {
        pluginId: functionCall.pluginId,
        pluginName: functionCall.pluginName,
        functionName: functionCall.functionName,
        success: result.success,
        executionTimeMs: executionTime,
        error: result.error,
        resultSummary: this.summarizeResult(result.data)
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Plugin execution failed: ${functionCall.pluginName}.${functionCall.functionName}`, error);

      return {
        pluginId: functionCall.pluginId,
        pluginName: functionCall.pluginName,
        functionName: functionCall.functionName,
        success: false,
        executionTimeMs: executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * Build processed message with plugin results
   */
  private async buildProcessedMessage(
    originalMessage: ChatMessage,
    functionCalls: FunctionCall[],
    results: PluginExecutionSummary[]
  ): Promise<ChatMessage> {
    let processedContent = originalMessage.content;

    // Replace function calls with results (in reverse order to maintain indices)
    const sortedCalls = [...functionCalls].sort((a, b) => b.startIndex - a.startIndex);
    
    for (let i = 0; i < sortedCalls.length; i++) {
      const call = sortedCalls[i];
      const result = results.find(r => 
        r.pluginId === call.pluginId && r.functionName === call.functionName
      );

      if (result) {
        const replacement = this.buildResultReplacement(call, result);
        processedContent = processedContent.substring(0, call.startIndex) + 
                          replacement + 
                          processedContent.substring(call.endIndex);
      }
    }

    return {
      ...originalMessage,
      content: processedContent,
      metadata: {
        ...originalMessage.metadata,
        hasPluginResults: true,
        pluginExecutions: results.length,
        successfulExecutions: results.filter(r => r.success).length
      }
    };
  }

  /**
   * Build replacement text for function call result
   */
  private buildResultReplacement(call: FunctionCall, result: PluginExecutionSummary): string {
    if (!result.success) {
      return `❌ **${call.pluginName}** failed: ${result.error}`;
    }

    // Different formatting based on plugin type
    switch (call.pluginName) {
      case 'flux':
      case 'image-generator':
        return result.resultSummary || `✅ **Image generated** (${result.executionTimeMs}ms)`;
      
      case 'audio-generator':
        return result.resultSummary || `🎵 **Audio generated** (${result.executionTimeMs}ms)`;
      
      case 'video-generator':
        return result.resultSummary || `🎬 **Video generated** (${result.executionTimeMs}ms)`;
      
      case 'n8n':
      case 'automation':
        return result.resultSummary || `⚡ **Workflow executed** (${result.executionTimeMs}ms)`;
      
      default:
        return result.resultSummary || `✅ **${call.functionName}** completed (${result.executionTimeMs}ms)`;
    }
  }

  /**
   * Summarize plugin execution result
   */
  private summarizeResult(data: any): string {
    if (!data) return 'No result data';

    // Handle image generation results
    const imageUrl = data.image_url || data.data?.image_url || (data.images && data.images[0]?.url);
    if (imageUrl) {
      let result = '';
      
      // Add metadata details if available
      const meta = data.metadata || data.data?.metadata;
      if (meta) {
        result = `**Details:**\n`;
        if (meta.width && meta.height) result += `📏 Größe: ${meta.width}×${meta.height}\n`;
        if (meta.seed) result += `🎲 Seed: ${meta.seed}\n`;
        if (meta.model) result += `🤖 Model: ${meta.model}\n`;
        if (meta.provider) result += `⚡ Provider: ${meta.provider}\n`;
      } else {
        result = `Bild wurde erfolgreich generiert.`;
      }
      
                    // Add image URL in markdown format for frontend extraction
      result += `\n![Generated Image](${imageUrl})`;
      
      return result;
    }

    // Handle different result types
    if (data.images && Array.isArray(data.images)) {
      return `Generated ${data.images.length} image(s)`;
    }

    if (data.audio_url) {
      return `Generated audio file`;
    }

    if (data.video_url) {
      return `Generated video file`;
    }

    if (data.workflow_result) {
      return `Workflow completed with result`;
    }

    if (typeof data === 'object' && data.success !== undefined) {
      return data.success ? 'Operation completed successfully' : 'Operation failed';
    }

    return 'Function executed successfully';
  }

  /**
   * Check if message contains plugin functions
   */
  async hasPluginFunctions(message: ChatMessage): Promise<boolean> {
    const context: ChatContext = {
      userId: message.userId,
      assistantId: message.assistantId,
      conversationId: message.conversationId
    };

    const functionCalls = await this.functionCallDetector.detectFunctionCalls(message.content, context);
    return functionCalls.length > 0;
  }

  /**
   * Preview function calls without executing them
   */
  async previewFunctionCalls(message: ChatMessage): Promise<FunctionCall[]> {
    const context: ChatContext = {
      userId: message.userId,
      assistantId: message.assistantId,
      conversationId: message.conversationId
    };

    return await this.functionCallDetector.detectFunctionCalls(message.content, context);
  }

  /**
   * Get available plugins for a chat context
   */
  async getAvailablePlugins(context: ChatContext): Promise<any[]> {
    // This would use the same logic as FunctionCallDetector
    // but expose it publicly for UI purposes
    return [];
  }
}

// Singleton instance
let chatPluginIntegrationInstance: ChatPluginIntegration | null = null;

export const getChatPluginIntegration = (): ChatPluginIntegration => {
  if (!chatPluginIntegrationInstance) {
    chatPluginIntegrationInstance = new ChatPluginIntegration();
  }
  return chatPluginIntegrationInstance;
}; 