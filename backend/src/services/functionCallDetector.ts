import { getPluginModel } from '../models/PluginSQLite';
import { PluginManifest, PluginFunction } from '../models/Plugin';
import { logger } from '../utils/logger';

export interface FunctionCall {
  pluginId: string;
  pluginName: string;
  functionName: string;
  parameters: { [key: string]: any };
  originalText: string;
  startIndex: number;
  endIndex: number;
}

export interface ChatContext {
  userId: string;
  assistantId?: string;
  conversationId?: string;
  availablePlugins?: string[]; // Plugin IDs available for this context
}

export class FunctionCallDetector {
  private pluginModel = getPluginModel();
  private functionCallRegex = /(?:use|call|execute|run)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\(([^)]*)\)/gi;
  private naturalLanguagePatterns = [
    // German Image generation patterns
    /(?:erstelle|generiere|erzeuge|mache|kreiere)\s+(?:ein|eine)?\s*(?:bild|foto|grafik|image)\s+(?:von|über|mit|zeigend)?\s*(.+)/i,
    /(?:zeichne|male|skizziere)\s+(?:mir\s+)?(.+)/i,
    /(?:kannst du|bitte|könntest du)\s*(?:erstelle|generiere|erzeuge)\s*(?:ein|eine)?\s*(?:bild|foto|grafik|image)\s+(.+)/i,
    
    // English Image generation patterns  
    /(?:generate|create|make)\s+(?:an?\s+)?image\s+(?:of|showing|with)\s+(.+)/i,
    /(?:draw|paint|sketch)\s+(?:me\s+)?(.+)/i,
    /(?:can you|please)\s+(?:generate|create|make)\s+(?:an?\s+)?(?:image|picture)\s+(.+)/i,
    
    // General plugin patterns
    /(?:use|call|execute|run)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:to|for|with)\s+(.+)/i,
    /(?:invoke|trigger)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:\-]\s*(.+)/i
  ];

  /**
   * Detect function calls in a message
   */
  async detectFunctionCalls(message: string, context: ChatContext): Promise<FunctionCall[]> {
    const calls: FunctionCall[] = [];

    try {
      // Get available plugins for the context
      const availablePlugins = await this.getAvailablePlugins(context);
      if (availablePlugins.length === 0) {
        return calls;
      }

      // 1. Detect explicit function calls (syntax: use plugin.function(params))
      const explicitCalls = await this.detectExplicitFunctionCalls(message, availablePlugins);
      calls.push(...explicitCalls);

      // 2. Detect natural language function calls
      const naturalCalls = await this.detectNaturalLanguageFunctionCalls(message, availablePlugins, context);
      calls.push(...naturalCalls);

      // 3. Remove overlapping calls (prefer explicit over natural language)
      const uniqueCalls = this.removeDuplicateCalls(calls);

      logger.info(`Detected ${uniqueCalls.length} function calls in message`, {
        userId: context.userId,
        assistantId: context.assistantId,
        callCount: uniqueCalls.length
      });

      return uniqueCalls;

    } catch (error) {
      logger.error('Error detecting function calls:', error);
      return [];
    }
  }

  /**
   * Detect explicit function calls using regex patterns
   */
  private async detectExplicitFunctionCalls(message: string, availablePlugins: any[]): Promise<FunctionCall[]> {
    const calls: FunctionCall[] = [];
    let match;

    while ((match = this.functionCallRegex.exec(message)) !== null) {
      const [fullMatch, functionRef, paramsStr] = match;
      const [pluginName, functionName] = functionRef.includes('.') 
        ? functionRef.split('.') 
        : [functionRef, 'generate']; // Default function name

      // Find matching plugin
      const plugin = availablePlugins.find(p => 
        p.name === pluginName || 
        p.display_name.toLowerCase() === pluginName.toLowerCase()
      );

      if (plugin) {
        const manifest: PluginManifest = JSON.parse(plugin.manifest);
        const funcDef = manifest.functions.find(f => f.name === functionName);

        if (funcDef) {
          const parameters = this.parseParameters(paramsStr, funcDef);
          
          calls.push({
            pluginId: plugin.id,
            pluginName: plugin.name,
            functionName: funcDef.name,
            parameters,
            originalText: fullMatch,
            startIndex: match.index,
            endIndex: match.index + fullMatch.length
          });
        }
      }
    }

    return calls;
  }

  /**
   * Detect natural language function calls
   */
  private async detectNaturalLanguageFunctionCalls(
    message: string, 
    availablePlugins: any[], 
    context: ChatContext
  ): Promise<FunctionCall[]> {
    const calls: FunctionCall[] = [];

    // Check for image generation requests
    const imageGenerationCalls = await this.detectImageGenerationRequests(message, availablePlugins);
    calls.push(...imageGenerationCalls);

    // Check for automation requests
    const automationCalls = await this.detectAutomationRequests(message, availablePlugins);
    calls.push(...automationCalls);

    return calls;
  }

  /**
   * Detect image generation requests
   */
  private async detectImageGenerationRequests(message: string, availablePlugins: any[]): Promise<FunctionCall[]> {
    const calls: FunctionCall[] = [];
    
    // Find image generation plugins
    const imagePlugins = availablePlugins.filter(p => p.plugin_type === 'image_generation');
    if (imagePlugins.length === 0) {
      logger.debug('No image generation plugins available');
      return calls;
    }

    logger.debug(`Checking message for image generation patterns: "${message}"`);
    logger.debug(`Available image plugins: ${imagePlugins.map(p => p.name).join(', ')}`);

    // Check all image generation patterns (first 6 patterns are for images)
    for (const pattern of this.naturalLanguagePatterns.slice(0, 6)) { 
      const match = message.match(pattern);
      if (match) {
        logger.debug(`Matched pattern: ${pattern}`);
        logger.debug(`Match result:`, match);
        
        const prompt = match[1]?.trim();
        if (prompt && prompt.length > 3) {
          // Use the first available image generation plugin
          const plugin = imagePlugins[0];
          const manifest: PluginManifest = JSON.parse(plugin.manifest);
          const generateFunc = manifest.functions.find(f => f.name === 'image_gen' || f.name === 'generate');

          if (generateFunc) {
            logger.info(`🎨 Detected image generation request: "${prompt}" using plugin: ${plugin.name}`);
            
            calls.push({
              pluginId: plugin.id,
              pluginName: plugin.name,
              functionName: generateFunc.name,
              parameters: {
                prompt: prompt,
                // Add default parameters from function definition
                ...this.getDefaultParameters(generateFunc)
              },
              originalText: match[0],
              startIndex: message.indexOf(match[0]),
              endIndex: message.indexOf(match[0]) + match[0].length
            });
          }
        }
        break; // Only match one pattern per message
      }
    }

    if (calls.length === 0) {
      logger.debug('No image generation patterns matched');
    }

    return calls;
  }

  /**
   * Detect automation requests (n8n, etc.)
   */
  private async detectAutomationRequests(message: string, availablePlugins: any[]): Promise<FunctionCall[]> {
    const calls: FunctionCall[] = [];
    
    // Find automation plugins
    const automationPlugins = availablePlugins.filter(p => p.plugin_type === 'automation');
    if (automationPlugins.length === 0) return calls;

    // Look for workflow/automation keywords
    const automationKeywords = ['workflow', 'automation', 'n8n', 'trigger', 'execute', 'run workflow'];
    const hasAutomationKeyword = automationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasAutomationKeyword) {
      // For now, we'll implement this when we have concrete automation plugins
      logger.info('Automation request detected but no specific implementation yet');
    }

    return calls;
  }

  /**
   * Get available plugins for the context
   */
  private async getAvailablePlugins(context: ChatContext): Promise<any[]> {
    if (context.availablePlugins && context.availablePlugins.length > 0) {
      // Get specific plugins by IDs
      const plugins: any[] = [];
      for (const pluginId of context.availablePlugins) {
        const plugin = await this.pluginModel.findPluginById(pluginId);
        if (plugin && plugin.is_active) {
          plugins.push(plugin);
        }
      }
      return plugins;
    }

    if (context.assistantId) {
      // Get plugins assigned to the assistant
      logger.info(`Getting plugins for assistant ${context.assistantId}`);
      
      try {
        const { getDatabase } = await import('../database/database');
        const db = getDatabase();
        
        const assignedPlugins = await db.all(
          `SELECT p.* FROM plugins p
           JOIN assistant_plugins ap ON p.id = ap.plugin_id
           WHERE ap.assistant_id = ? AND ap.is_enabled = 1 AND p.is_active = 1
           ORDER BY ap.sort_order ASC`,
          [context.assistantId]
        );
        
        logger.info(`Found ${assignedPlugins.length} active plugins for assistant ${context.assistantId}`);
        return assignedPlugins;
      } catch (error) {
        logger.error('Error loading assistant plugins:', error);
        return [];
      }
    }

    // Get all public plugins as fallback
    const allPlugins = await this.pluginModel.findAllPlugins();
    return allPlugins.filter(p => p.is_public && p.is_active);
  }

  /**
   * Parse function parameters from string
   */
  private parseParameters(paramsStr: string, funcDef: PluginFunction): { [key: string]: any } {
    const params: { [key: string]: any } = {};

    if (!paramsStr.trim()) {
      return this.getDefaultParameters(funcDef);
    }

    try {
      // Try to parse as JSON first
      if (paramsStr.trim().startsWith('{')) {
        const parsed = JSON.parse(paramsStr);
        return { ...this.getDefaultParameters(funcDef), ...parsed };
      }

      // Parse simple key=value pairs
      const pairs = paramsStr.split(',').map(p => p.trim());
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          
          // Remove quotes
          const cleanValue = value.replace(/^["']|["']$/g, '');
          
          // Try to convert to appropriate type
          if (funcDef.parameters[key.trim()]) {
            params[key.trim()] = this.convertParameterValue(cleanValue, funcDef.parameters[key.trim()]);
          }
        }
      }

      return { ...this.getDefaultParameters(funcDef), ...params };

    } catch (error) {
      logger.warn('Failed to parse function parameters:', paramsStr);
      return this.getDefaultParameters(funcDef);
    }
  }

  /**
   * Convert parameter value to appropriate type
   */
  private convertParameterValue(value: string, paramDef: any): any {
    switch (paramDef.type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? paramDef.default : num;
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return value.split(',').map(v => v.trim());
        }
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return paramDef.default || {};
        }
      default:
        return value;
    }
  }

  /**
   * Get default parameters for a function
   */
  private getDefaultParameters(funcDef: PluginFunction): { [key: string]: any } {
    const defaults: { [key: string]: any } = {};
    
    Object.entries(funcDef.parameters).forEach(([key, paramDef]) => {
      if (paramDef.default !== undefined) {
        defaults[key] = paramDef.default;
      }
    });

    return defaults;
  }

  /**
   * Remove duplicate and overlapping function calls
   */
  private removeDuplicateCalls(calls: FunctionCall[]): FunctionCall[] {
    // Sort by start index
    calls.sort((a, b) => a.startIndex - b.startIndex);

    const unique: FunctionCall[] = [];
    for (const call of calls) {
      const hasOverlap = unique.some(existing => 
        (call.startIndex >= existing.startIndex && call.startIndex < existing.endIndex) ||
        (call.endIndex > existing.startIndex && call.endIndex <= existing.endIndex)
      );

      if (!hasOverlap) {
        unique.push(call);
      }
    }

    return unique;
  }

  /**
   * Check if a plugin function exists and is available
   */
  async isPluginFunctionAvailable(pluginName: string, functionName: string, context: ChatContext): Promise<boolean> {
    try {
      const availablePlugins = await this.getAvailablePlugins(context);
      const plugin = availablePlugins.find(p => p.name === pluginName);
      
      if (!plugin || !plugin.is_active) return false;

      const manifest: PluginManifest = JSON.parse(plugin.manifest);
      return manifest.functions.some(f => f.name === functionName);
    } catch (error) {
      logger.error('Error checking plugin function availability:', error);
      return false;
    }
  }
}

// Singleton instance
let functionCallDetectorInstance: FunctionCallDetector | null = null;

export const getFunctionCallDetector = (): FunctionCallDetector => {
  if (!functionCallDetectorInstance) {
    functionCallDetectorInstance = new FunctionCallDetector();
  }
  return functionCallDetectorInstance;
}; 