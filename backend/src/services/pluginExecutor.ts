import axios from 'axios';
import { getPluginModel } from '../models/PluginSQLite';
import { 
  PluginExecution, 
  PluginExecutionContext, 
  PluginExecutionResult, 
  PluginEvent, 
  PluginManifest,
  PluginFunction,
  PluginFunctionParameter,
  generatePluginExecutionId 
} from '../models/Plugin';
import { logger } from '../utils/logger';

export interface PluginCallRequest {
  pluginId: string;
  functionName: string;
  parameters: { [key: string]: any };
  userId: string;
  assistantId?: string;
  conversationId?: string;
  eventEmitter?: (event: PluginEvent) => Promise<void>;
}

export class PluginExecutor {
  private pluginModel = getPluginModel();

  /**
   * Execute a plugin function (alias for executePlugin)
   */
  async executeFunction(
    pluginId: string, 
    functionName: string, 
    parameters: { [key: string]: any }, 
    context: { userId: string; assistantId?: string; conversationId?: string }
  ): Promise<PluginExecutionResult> {
    return this.executePlugin({
      pluginId,
      functionName,
      parameters,
      userId: context.userId,
      assistantId: context.assistantId,
      conversationId: context.conversationId
    });
  }

  /**
   * Execute a plugin function
   */
  async executePlugin(request: PluginCallRequest): Promise<PluginExecutionResult> {
    const executionId = generatePluginExecutionId();
    const startTime = Date.now();

    try {
      await this.emitEvent(request.eventEmitter, {
        type: 'status',
        data: {
          status: 'pending',
          description: 'Initializing plugin execution...',
          done: false
        }
      });

      // Log execution start
      await this.logExecution(executionId, {
        plugin_id: request.pluginId,
        assistant_id: request.assistantId,
        conversation_id: request.conversationId,
        user_id: request.userId,
        function_name: request.functionName,
        input_parameters: JSON.stringify(request.parameters),
        status: 'pending',
        started_at: new Date().toISOString()
      });

      // Get plugin details
      const plugin = await this.pluginModel.findPluginById(request.pluginId);
      if (!plugin || !plugin.is_active) {
        throw new Error(`Plugin not found or inactive: ${request.pluginId}`);
      }

      const manifest: PluginManifest = JSON.parse(plugin.manifest);
      
      // Find the function
      const functionDef = manifest.functions.find(f => f.name === request.functionName);
      if (!functionDef) {
        throw new Error(`Function '${request.functionName}' not found in plugin '${plugin.name}'`);
      }

      // Validate parameters
      this.validateParameters(functionDef, request.parameters);

      // Get plugin configuration
      const config = await this.pluginModel.getResolvedPluginConfig(request.pluginId, request.userId);

      // Create execution context
      const context: PluginExecutionContext = {
        user: {
          id: request.userId,
          username: 'user', // TODO: Get from user model
          role: 'user'
        },
        assistant_id: request.assistantId,
        conversation_id: request.conversationId,
        config,
        event_emitter: request.eventEmitter
      };

      await this.emitEvent(request.eventEmitter, {
        type: 'status',
        data: {
          status: 'in_progress',
          description: `Executing ${functionDef.name}...`,
          done: false
        }
      });

      // Update execution status
      await this.updateExecution(executionId, {
        status: 'running',
        started_at: new Date().toISOString()
      });

      // Execute based on runtime type
      let result: any;
      switch (plugin.runtime_type) {
        case 'api_call':
          result = await this.executeApiCall(manifest, functionDef, request.parameters, context);
          break;
        case 'nodejs':
          result = await this.executeNodeJS(manifest, functionDef, request.parameters, context);
          break;
        case 'webhook':
          result = await this.executeWebhook(manifest, functionDef, request.parameters, context);
          break;
        default:
          throw new Error(`Unsupported runtime type: ${plugin.runtime_type}`);
      }

      const executionTime = Date.now() - startTime;

      // Update execution with success
      await this.updateExecution(executionId, {
        status: 'completed',
        output_result: JSON.stringify(result),
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString()
      });

      await this.emitEvent(request.eventEmitter, {
        type: 'status',
        data: {
          status: 'completed',
          description: 'Plugin execution completed successfully',
          done: true
        }
      });

      logger.info(`Plugin execution completed: ${request.pluginId}:${request.functionName} in ${executionTime}ms`);

      return {
        success: true,
        data: result,
        execution_time_ms: executionTime,
        metadata: {
          plugin_id: request.pluginId,
          function_name: request.functionName,
          execution_id: executionId
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update execution with error
      await this.updateExecution(executionId, {
        status: 'failed',
        error_message: errorMessage,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString()
      });

      await this.emitEvent(request.eventEmitter, {
        type: 'error',
        data: {
          status: 'error',
          description: `Plugin execution failed: ${errorMessage}`,
          error: errorMessage,
          done: true
        }
      });

      logger.error(`Plugin execution failed: ${request.pluginId}:${request.functionName}`, error);

      return {
        success: false,
        error: errorMessage,
        execution_time_ms: executionTime,
        metadata: {
          plugin_id: request.pluginId,
          function_name: request.functionName,
          execution_id: executionId
        }
      };
    }
  }

  /**
   * Execute API call plugin
   */
  private async executeApiCall(
    manifest: PluginManifest, 
    functionDef: PluginFunction, 
    parameters: any, 
    context: PluginExecutionContext
  ): Promise<any> {
    const endpoint = manifest.endpoints?.execute;
    if (!endpoint) {
      throw new Error('No execute endpoint defined for API call plugin');
    }

    // Replace placeholders in endpoint URL
    let url = endpoint;
    if (context.config.model_name) {
      url = url.replace('{model_name}', context.config.model_name);
    }

    // Prepare request payload based on function parameters
    const payload = this.buildApiPayload(functionDef, parameters, context);

    // Prepare headers
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };

    // Add authorization if API key is configured
    if (context.config.api_key) {
      headers['Authorization'] = `Key ${context.config.api_key}`;
    }

    const requestConfig = {
      method: 'POST' as const,
      url,
      headers,
      data: payload,
      timeout: (context.config.timeout || 30) * 1000 // Convert to milliseconds
    };

    await this.emitEvent(context.event_emitter, {
      type: 'status',
      data: {
        status: 'in_progress',
        description: `Making API call to ${new URL(url).hostname}...`,
        done: false
      }
    });

    const response = await axios(requestConfig);

    // Handle different response formats
    if (response.data && (response.data as any).images) {
      // Flux-style response with images
      return this.handleImageResponse(response.data, context);
    }

    return response.data;
  }

  /**
   * Execute Node.js plugin
   */
  private async executeNodeJS(
    manifest: PluginManifest, 
    functionDef: PluginFunction, 
    parameters: any, 
    context: PluginExecutionContext
  ): Promise<any> {
    try {
      await this.emitEvent(context.event_emitter, {
        type: 'status',
        data: {
          status: 'in_progress',
          description: 'Executing Node.js plugin...',
          done: false
        }
      });

      // Create sandbox environment for Node.js plugin execution
      // Use native fetch (Node.js 18+) - no external dependency needed
      const sandbox: any = {
        console,
        require: null,
        process: null,
        global: null,
        __dirname: null,
        __filename: null,
        Buffer: Buffer,  // Allow Buffer for audio/binary data processing
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        parameters: parameters,
        config: context.config,
        fetch: fetch  // Native Node.js 18+ fetch
      };

      // Set up fal.ai client if needed
      if (context.config.api_key) {
        try {
          // Import fal.ai client dynamically 
          const falModule = await import('@fal-ai/client');
          
          // Configure fal.ai client with API key
          // Set environment variable for fal.ai
          process.env.FAL_KEY = context.config.api_key;
          
          // Get the fal client from the named export
          const { fal } = falModule;
          
          // Configure the client
          if (typeof fal.config === 'function') {
            fal.config({
              credentials: context.config.api_key
            });
          }
          
          // Provide properly configured fal.ai client to sandbox
          sandbox.fal = {
            run: fal.run.bind(fal),
            subscribe: fal.subscribe.bind(fal),
            queue: fal.queue,
            config: fal.config.bind(fal),
            stream: fal.stream,
            realtime: fal.realtime,
            storage: fal.storage
          };
          
          // Debug logging
          console.log('🔧 fal.ai client setup:', {
            hasRun: typeof sandbox.fal.run === 'function',
            hasSubscribe: typeof sandbox.fal.subscribe === 'function',
            hasQueue: typeof sandbox.fal.queue === 'function',
            apiKeyConfigured: !!context.config.api_key,
            falExports: Object.keys(fal)
          });
          
        } catch (error) {
          console.error('❌ Failed to setup fal.ai client:', error);
          console.error('❌ Error details:', error);
          sandbox.fal = null;
        }
      } else {
        console.warn('⚠️ No API key configured for fal.ai client');
        sandbox.fal = null;
      }

      // Execute the plugin code
      const vm = require('vm');
      const vmContext = vm.createContext(sandbox);
      
      // Wrap the plugin code in an async function
      const wrappedCode = `
        (async function() {
          ${manifest.code}
          
          // If the function is defined, call it
          if (typeof ${functionDef.name} === 'function') {
            return await ${functionDef.name}(parameters);
          } else {
            throw new Error('Function ${functionDef.name} not found in plugin code');
          }
        })()
      `;

      const result = await vm.runInContext(wrappedCode, vmContext);
      
      await this.emitEvent(context.event_emitter, {
        type: 'status',
        data: {
          status: 'completed',
          description: 'Node.js plugin executed successfully',
          done: true
        }
      });

      return result;

    } catch (error) {
      await this.emitEvent(context.event_emitter, {
        type: 'error',
        data: {
          status: 'error',
          description: `Node.js plugin execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          done: true
        }
      });

      throw error;
    }
  }

  /**
   * Execute webhook plugin
   */
  private async executeWebhook(
    manifest: PluginManifest, 
    functionDef: PluginFunction, 
    parameters: any, 
    context: PluginExecutionContext
  ): Promise<any> {
    const webhookUrl = context.config.n8n_webhook_url || manifest.endpoints?.execute;
    if (!webhookUrl) {
      throw new Error('No webhook URL configured for webhook plugin');
    }

    // Prepare request payload
    const payload = this.buildWebhookPayload(functionDef, parameters, context);

    // Prepare headers
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
      'User-Agent': 'Skillbox-Plugin-System/1.0'
    };

    // Add authorization if API token is configured
    if (context.config.api_token) {
      headers['Authorization'] = `Bearer ${context.config.api_token}`;
    }

    const requestConfig = {
      method: 'GET' as const, // n8n webhooks typically use GET with query params
      url: webhookUrl,
      headers,
      params: payload, // Send as query parameters for GET request
      timeout: (context.config.timeout || 30) * 1000, // Convert to milliseconds
      responseType: 'json' as const,
      responseEncoding: 'utf8' as const
    };

    await this.emitEvent(context.event_emitter, {
      type: 'status',
      data: {
        status: 'in_progress',
        description: `Calling webhook: ${new URL(webhookUrl).hostname}...`,
        done: false
      }
    });

    const response = await axios(requestConfig);

    // Handle n8n webhook response
    if (response.data) {
      // Format the keywords for display
      let formattedResponse = response.data;
      
      if ((response.data as any).Keywords && Array.isArray((response.data as any).Keywords)) {
        const keywords = (response.data as any).Keywords.map((keyword: string) => {
          // Fix common UTF-8 encoding issues for German umlauts
          let fixed = keyword;
          // Replace common encoding issues
          fixed = fixed.replace(/Ã¤/g, 'ä');
          fixed = fixed.replace(/Ã¶/g, 'ö');
          fixed = fixed.replace(/Ã¼/g, 'ü');
          fixed = fixed.replace(/ÃŸ/g, 'ß');
          fixed = fixed.replace(/Ã„/g, 'Ä');
          fixed = fixed.replace(/Ã–/g, 'Ö');
          fixed = fixed.replace(/Ãœ/g, 'Ü');
          // Fix the specific issue with zitronensäure
          fixed = fixed.replace(/zitronensäure/g, 'zitronensäure');
          fixed = fixed.replace(/säure/g, 'säure');
          // General fallback for ä character in common contexts
          fixed = fixed.replace(/ä/g, 'ä'); // Most common case
          return fixed;
        });
        const keywordList = keywords.map((keyword: string, index: number) => `${index + 1}. ${keyword}`).join('\n');
        
        // Emit the keywords as a message to the chat
        await this.emitEvent(context.event_emitter, {
          type: 'message',
          data: {
            content: `🔍 **Keyword-Recherche Ergebnisse:**\n\n${keywordList}\n\n💡 **Tipp:** Diese Keywords eignen sich perfekt für SEO-optimierte Blog-Artikel!`,
            done: false
          }
        });

        // Also format the response data
        formattedResponse = {
          keywords: keywords,
          count: keywords.length,
          formatted_list: keywordList,
          metadata: {
            source: 'Google Autosuggest',
            generated_at: new Date().toISOString()
          }
        };
      }

      await this.emitEvent(context.event_emitter, {
        type: 'status',
        data: {
          status: 'completed',
          description: `Webhook executed successfully - Generated ${((response.data as any).Keywords?.length || 0)} keywords`,
          done: true
        }
      });

      return formattedResponse;
    }

    throw new Error('Empty response from webhook');
  }

  /**
   * Build API payload for function call
   */
  private buildApiPayload(functionDef: PluginFunction, parameters: any, context: PluginExecutionContext): any {
    const payload: any = {};

    // Add function parameters
    Object.keys(parameters).forEach(key => {
      if (parameters[key] !== undefined) {
        payload[key] = parameters[key];
      }
    });

    // Add configuration parameters if they match function parameters
    Object.keys(context.config).forEach(key => {
      if (functionDef.parameters[key] && payload[key] === undefined) {
        payload[key] = context.config[key];
      }
    });

    return payload;
  }

  /**
   * Build webhook payload for function call
   */
  private buildWebhookPayload(functionDef: PluginFunction, parameters: any, context: PluginExecutionContext): any {
    const payload: any = {};

    // For n8n webhooks, we typically send parameters as query params
    // The main parameter is usually 'q' for the keyword
    // Support multiple parameter names for keywords
    const keywordValue = parameters.keyword || parameters.seed_keyword || parameters.query || parameters.q;
    if (keywordValue) {
      payload.q = keywordValue;
    }

    // Add other function parameters
    Object.keys(parameters).forEach(key => {
      if (parameters[key] !== undefined && !['keyword', 'seed_keyword', 'query', 'q'].includes(key)) {
        payload[key] = parameters[key];
      }
    });

    // Add configuration parameters if they match function parameters
    Object.keys(context.config).forEach(key => {
      if (functionDef.parameters[key] && payload[key] === undefined) {
        payload[key] = context.config[key];
      }
    });

    return payload;
  }

  /**
   * Handle image generation response
   */
  private async handleImageResponse(data: any, context: PluginExecutionContext): Promise<any> {
    if (!data.images || !Array.isArray(data.images)) {
      return data;
    }

    // Emit image results to the chat
    for (const image of data.images) {
      await this.emitEvent(context.event_emitter, {
        type: 'message',
        data: {
          content: `![Generated Image](${image.url})`,
          done: false
        }
      });
    }

    return {
      images: data.images,
      metadata: {
        generated_images: data.images.length,
        total_pixels: data.images.reduce((total: number, img: any) => total + (img.width * img.height), 0)
      }
    };
  }

  /**
   * Validate function parameters
   */
  private validateParameters(functionDef: PluginFunction, parameters: any): void {
    const errors: string[] = [];

    // Check required parameters
    Object.entries(functionDef.parameters).forEach(([paramName, paramDef]) => {
      if (paramDef.required && (parameters[paramName] === undefined || parameters[paramName] === null)) {
        errors.push(`Required parameter '${paramName}' is missing`);
      }

      if (parameters[paramName] !== undefined) {
        // Type validation
        if (!this.validateParameterType(parameters[paramName], paramDef)) {
          errors.push(`Parameter '${paramName}' has invalid type. Expected: ${paramDef.type}`);
        }

        // Enum validation
        if (paramDef.type === 'enum' && paramDef.values && !paramDef.values.includes(parameters[paramName])) {
          errors.push(`Parameter '${paramName}' must be one of: ${paramDef.values.join(', ')}`);
        }

        // Number range validation
        if (paramDef.type === 'number') {
          if (paramDef.min !== undefined && parameters[paramName] < paramDef.min) {
            errors.push(`Parameter '${paramName}' must be >= ${paramDef.min}`);
          }
          if (paramDef.max !== undefined && parameters[paramName] > paramDef.max) {
            errors.push(`Parameter '${paramName}' must be <= ${paramDef.max}`);
          }
        }
      }
    });

    // Custom validation for keyword generator: at least one keyword parameter must be provided
    if (functionDef.name === 'generate_keywords') {
      const hasKeyword = parameters.keyword || parameters.seed_keyword || parameters.query || parameters.q;
      if (!hasKeyword) {
        errors.push('At least one keyword parameter (keyword, seed_keyword, query, or q) must be provided');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Parameter validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: any, paramDef: PluginFunctionParameter): boolean {
    switch (paramDef.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'enum':
        return typeof value === 'string'; // Enum values are validated separately
      default:
        return true; // Unknown types pass validation
    }
  }

  /**
   * Log plugin execution
   */
  private async logExecution(executionId: string, execution: Omit<PluginExecution, 'id' | 'created_at'>): Promise<void> {
    try {
      // TODO: Implement when plugin execution logging table is available
      // await this.pluginModel.createPluginExecution({ id: executionId, ...execution });
      logger.info(`Plugin execution logged: ${executionId}`);
    } catch (error) {
      logger.error('Failed to log plugin execution:', error);
    }
  }

  /**
   * Update plugin execution
   */
  private async updateExecution(executionId: string, updates: Partial<PluginExecution>): Promise<void> {
    try {
      // TODO: Implement when plugin execution logging table is available
      // await this.pluginModel.updatePluginExecution(executionId, updates);
      logger.info(`Plugin execution updated: ${executionId}`, updates);
    } catch (error) {
      logger.error('Failed to update plugin execution:', error);
    }
  }

  /**
   * Emit event to client
   */
  private async emitEvent(eventEmitter: ((event: PluginEvent) => Promise<void>) | undefined, event: PluginEvent): Promise<void> {
    if (eventEmitter) {
      try {
        await eventEmitter(event);
      } catch (error) {
        logger.error('Failed to emit plugin event:', error);
      }
    }
  }
}

// Singleton instance
let pluginExecutorInstance: PluginExecutor | null = null;

export const getPluginExecutor = (): PluginExecutor => {
  if (!pluginExecutorInstance) {
    pluginExecutorInstance = new PluginExecutor();
  }
  return pluginExecutorInstance;
}; 