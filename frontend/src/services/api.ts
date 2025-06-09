import { ApiResponse, Assistant, Message, Conversation, ConversationResponse } from '../types';
import { LoginRequest, RegisterRequest, User, SupportedLanguage } from '../types';
import { Plugin, PluginConfig, AssistantPlugin, PluginExecution } from '../types';
import config from '../config';

// API Configuration
const API_CONFIG = {
  baseUrl: config.API_URL,
  assistantOSUrl: process.env.REACT_APP_ASSISTANTOS_URL || 'https://kr.assistantos.de',
  timeout: 30000, // 30 seconds for AI responses
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Utility function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic API request function with retry logic
async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  useAssistantOS = false
): Promise<T> {
  const baseUrl = useAssistantOS ? API_CONFIG.assistantOSUrl : API_CONFIG.baseUrl;
  const fullUrl = `${baseUrl}${url}`;
  
  // Default headers
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add authentication token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let lastError: Error | undefined;

  // Retry logic
  for (let attempt = 1; attempt <= API_CONFIG.retryAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(fullUrl, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.error?.code,
          errorData.error?.details
        );
      }

      const data = await response.json();
      return data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timed out');
      }

      // If this was the last attempt, throw the error
      if (attempt === API_CONFIG.retryAttempts) {
        if (error instanceof ApiError || error instanceof NetworkError) {
          throw error;
        }
        throw new NetworkError(`Network error: ${lastError.message}`);
      }

      // Wait before retrying
      await delay(API_CONFIG.retryDelay * attempt);
    }
  }

  throw lastError || new NetworkError('Unknown error occurred');
}

// API Service class
export class ApiService {
  // Auth endpoints
  static async login(username: string, password: string) {
    return apiRequest<ApiResponse<{ token: string; refreshToken: string; user: any }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) {
    return apiRequest<ApiResponse<{ token: string; refreshToken: string; user: any }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async refreshToken(refreshToken: string) {
    return apiRequest<ApiResponse<{ token: string; refreshToken: string }>>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Assistant endpoints
  static async getAssistants() {
    return apiRequest<ApiResponse<Assistant[]>>('/api/assistants');
  }

  static async getAssistant(id: string) {
    return apiRequest<ApiResponse<Assistant>>(`/api/assistants/${id}`);
  }

  // Tools endpoints
  static async getTools() {
    return apiRequest<ApiResponse<any[]>>('/api/tools');
  }

  // Chat endpoints
  static async createConversation(assistantId: string) {
    try {
      const response = await apiRequest<ConversationResponse>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ assistantId }),
      });
      
      if (!response.success || !response.conversation) {
        throw new ApiError('Failed to create conversation - Invalid response');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError('Failed to create conversation');
    }
  }

  static async getConversation(id: string) {
    return apiRequest<ApiResponse<Conversation>>(`/api/conversations/${id}`);
  }

  static async getConversations(assistantId?: string) {
    const url = assistantId ? `/api/conversations?assistant_id=${assistantId}` : '/api/conversations';
    return apiRequest<ApiResponse<Conversation[]>>(url);
  }

  static async updateConversation(id: string, data: { title?: string }) {
    return apiRequest<ApiResponse<Conversation>>(`/api/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteConversation(id: string) {
    return apiRequest<ApiResponse<{ message: string }>>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  static async getConversationMessages(conversationId: string) {
    return apiRequest<ApiResponse<Message[]>>(`/api/conversations/${conversationId}/messages`);
  }

  // AssistantOS Chat Integration
  static async sendChatMessage(
    assistant: Assistant,
    message: string,
    conversationId?: string,
    files?: File[]
  ): Promise<ReadableStream<Uint8Array>> {
    
    // First, create a conversation if none exists
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      try {
        const convResponse = await this.createConversation(assistant.id);
        if (convResponse.success && convResponse.conversation) {
          activeConversationId = convResponse.conversation.id;
        } else {
          throw new ApiError('Failed to create conversation - No conversation returned');
        }
      } catch (error) {
        console.error('Error creating conversation for message:', error);
        throw error;
      }
    }

    // Backend expects: { content }
    const requestBody = {
      content: message
    };

    try {
      // Use the modern conversations route instead of legacy chats route
      const jsonResponse = await apiRequest<{
        success: boolean;
        data: {
          message: {
            id: string;
            content: string;
            role: string;
            timestamp: string;
          };
          conversation: {
            id: string;
            title: string;
          };
        };
        timestamp: string;
      }>(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Validate response
      if (!jsonResponse.success || !jsonResponse.data || !jsonResponse.data.message) {
        throw new ApiError('Invalid response from AI service');
      }

      // Extract response data
      const responseContent = jsonResponse.data.message.content || 'No response received';
      
      // Convert to OpenAI-style streaming format
      const openAIChunk = {
        choices: [{
          delta: {
            content: responseContent
          }
        }]
      };
      
      const streamData = `data: ${JSON.stringify(openAIChunk)}\n\ndata: [DONE]\n\n`;
      
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(streamData));
          controller.close();
        }
      });

      return stream;
    } catch (error) {
      console.error('Chat message error:', error);
      
      // Provide more specific error messages
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          throw new ApiError('Authentication failed - Please check your login');
        } else if (error.statusCode === 404) {
          throw new ApiError('Conversation or assistant not found');
        } else if (error.statusCode === 502) {
          throw new ApiError('AI service temporarily unavailable - Please try again');
        }
      }
      
      throw error;
    }
  }

  // Simplified message sending for useChat.tsx compatibility
  static async sendMessage(conversationId: string, content: string, files?: File[]) {
    const requestBody = {
      content
    };

    try {
      // Use the modern conversations route
      const jsonResponse = await apiRequest<{
        success: boolean;
        data: {
          message: {
            id: string;
            content: string;
            role: string;
            timestamp: string;
          };
          conversation: {
            id: string;
            title: string;
          };
        };
        timestamp: string;
      }>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Validate response
      if (!jsonResponse.success || !jsonResponse.data || !jsonResponse.data.message) {
        throw new ApiError('Invalid response from AI service');
      }

      // Return simplified format for useChat.tsx
      return {
        response: jsonResponse.data.message.content,
        messageId: jsonResponse.data.message.id,
        timestamp: jsonResponse.data.message.timestamp,
        conversationId: jsonResponse.data.conversation.id
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  // File upload/download
  static async uploadFile(file: File, conversationId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    return apiRequest<ApiResponse<{ id: string; url: string; filename: string }>>('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type header for FormData
    });
  }

  static async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new ApiError(`Download failed: ${response.statusText}`, response.status);
    }

    return response.blob();
  }

  // Health check
  static async healthCheck() {
    return apiRequest<{ status: string; timestamp: string; version: string }>('/health');
  }

  // Admin endpoints
  static async getUsers() {
    return apiRequest<ApiResponse<any[]>>('/api/admin/users');
  }

  static async createUser(userData: { username: string; email: string; password: string; role: string }) {
    return apiRequest<ApiResponse<{ user: any }>>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async deleteUser(userId: string) {
    return apiRequest<ApiResponse<{ message: string }>>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  static async updateUserRole(userId: string, role: string) {
    return apiRequest<ApiResponse<any>>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  static async createAssistant(assistantData: any) {
    return apiRequest<ApiResponse<any>>('/api/assistants', {
      method: 'POST',
      body: JSON.stringify(assistantData),
    });
  }

  static async updateAssistant(id: string, assistantData: any) {
    return apiRequest<ApiResponse<any>>(`/api/assistants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assistantData),
    });
  }

  static async deleteAssistant(id: string) {
    return apiRequest<ApiResponse<{ message: string }>>(`/api/assistants/${id}`, {
      method: 'DELETE',
    });
  }

  static async createTool(toolData: any) {
    return apiRequest<ApiResponse<any>>('/api/tools/admin', {
      method: 'POST',
      body: JSON.stringify(toolData),
    });
  }

  static async updateTool(id: number, toolData: any) {
    return apiRequest<ApiResponse<any>>(`/api/tools/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toolData),
    });
  }

  static async deleteTool(id: number) {
    return apiRequest<ApiResponse<{ message: string }>>(`/api/tools/admin/${id}`, {
      method: 'DELETE',
    });
  }

  // Plugin endpoints (Phase 2: Frontend Integration)
  static async getPlugins() {
    return apiRequest<ApiResponse<Plugin[]>>('/api/plugins');
  }

  static async getPlugin(id: string) {
    return apiRequest<ApiResponse<Plugin>>(`/api/plugins/${id}`);
  }

  static async createPlugin(pluginData: Partial<Plugin>) {
    return apiRequest<ApiResponse<Plugin>>('/api/plugins', {
      method: 'POST',
      body: JSON.stringify(pluginData),
    });
  }

  static async updatePlugin(id: string, pluginData: Partial<Plugin>) {
    return apiRequest<ApiResponse<Plugin>>(`/api/plugins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pluginData),
    });
  }

  static async deletePlugin(id: string) {
    return apiRequest<ApiResponse<any>>(`/api/plugins/${id}`, {
      method: 'DELETE',
    });
  }

  static async getPluginConfig(id: string) {
    return apiRequest<ApiResponse<PluginConfig>>(`/api/plugins/${id}/config`);
  }

  static async updatePluginConfig(id: string, configData: any) {
    return apiRequest<ApiResponse<PluginConfig>>(`/api/plugins/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  static async getAssistantPlugins(assistantId: string) {
    return apiRequest<ApiResponse<AssistantPlugin[]>>(`/api/assistants/${assistantId}/plugins`);
  }

  static async assignPluginToAssistant(assistantId: string, pluginId: string, config?: any) {
    return apiRequest<ApiResponse<AssistantPlugin>>(`/api/assistants/${assistantId}/plugins`, {
      method: 'POST',
      body: JSON.stringify({ plugin_id: pluginId, config_override: config }),
    });
  }

  static async unassignPluginFromAssistant(assistantId: string, pluginId: string) {
    return apiRequest<ApiResponse<void>>(`/api/assistants/${assistantId}/plugins/${pluginId}`, {
      method: 'DELETE',
    });
  }

  static async updateAssistantPlugin(assistantId: string, pluginId: string, update: Partial<AssistantPlugin>) {
    return apiRequest<ApiResponse<AssistantPlugin>>(`/api/assistants/${assistantId}/plugins/${pluginId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  static async removePluginFromAssistant(assistantId: string, pluginId: string) {
    return apiRequest<ApiResponse<any>>(`/api/assistants/${assistantId}/plugins/${pluginId}`, {
      method: 'DELETE',
    });
  }

  static async getPluginExecutions(pluginId?: string, assistantId?: string) {
    let url = '/api/plugin-execution/logs';
    const params = new URLSearchParams();
    if (pluginId) params.append('plugin_id', pluginId);
    if (assistantId) params.append('assistant_id', assistantId);
    if (params.toString()) url += `?${params.toString()}`;
    
    return apiRequest<ApiResponse<PluginExecution[]>>(url);
  }
}

// Streaming response parser for AssistantOS
export class StreamingResponseParser {
  private decoder = new TextDecoder();
  
  async *parseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += this.decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                yield parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Failed to parse streaming response:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default ApiService; 