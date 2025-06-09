import { Database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

// Plugin Types
export type PluginType = 'image_generation' | 'audio_generation' | 'video_generation' | 'automation' | 'api_tool' | 'custom';
export type RuntimeType = 'nodejs' | 'python' | 'api_call' | 'webhook';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Plugin Configuration Schema
export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'json';
  required?: boolean;
  default?: any;
  secret?: boolean; // For API keys, passwords, etc.
  description?: string;
  values?: string[]; // For enum type
  min?: number; // For number type
  max?: number; // For number type
}

export interface PluginConfigSchema {
  [key: string]: PluginConfigField;
}

// Plugin Function Parameter Definition
export interface PluginFunctionParameter {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description?: string;
  values?: string[]; // For enum type
  items?: PluginFunctionParameter; // For array type
  properties?: { [key: string]: PluginFunctionParameter }; // For object type
  min?: number; // For number type
  max?: number; // For number type
}

// Plugin Function Definition
export interface PluginFunction {
  name: string;
  description: string;
  parameters: { [key: string]: PluginFunctionParameter };
}

// Plugin Manifest
export interface PluginManifest {
  name: string;
  display_name: string;
  version: string;
  description?: string;
  author?: string;
  runtime: RuntimeType;
  functions: PluginFunction[];
  config_schema?: PluginConfigSchema;
  endpoints?: {
    execute?: string;
    webhook?: string;
    health?: string;
  };
  code?: string; // JavaScript/Node.js code for nodejs runtime
  requirements?: string[]; // npm packages, python packages, etc.
  permissions?: string[]; // Required permissions
  metadata?: { [key: string]: any };
}

// Database Interfaces
export interface Plugin {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  version: string;
  author?: string;
  plugin_type: PluginType;
  runtime_type: RuntimeType;
  config_schema?: string; // JSON string
  manifest: string; // JSON string
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PluginConfig {
  id: string;
  plugin_id: string;
  user_id?: string; // NULL for global config
  config_data: string; // JSON string
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AssistantPlugin {
  id: string;
  assistant_id: string;
  plugin_id: string;
  is_enabled: boolean;
  sort_order: number;
  config_override?: string; // JSON string
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PluginExecution {
  id: string;
  plugin_id: string;
  assistant_id?: string;
  conversation_id?: string;
  user_id: string;
  function_name: string;
  input_parameters?: string; // JSON string
  output_result?: string; // JSON string
  status: ExecutionStatus;
  error_message?: string;
  execution_time_ms?: number;
  cost_cents?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// Plugin Execution Context
export interface PluginExecutionContext {
  user: {
    id: string;
    username: string;
    role: string;
    [key: string]: any;
  };
  assistant_id?: string;
  conversation_id?: string;
  config: { [key: string]: any };
  event_emitter?: (event: PluginEvent) => Promise<void>;
}

// Plugin Events
export interface PluginEvent {
  type: 'status' | 'message' | 'progress' | 'error';
  data: {
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
    description?: string;
    done?: boolean;
    progress?: number; // 0-100
    content?: string; // For message events
    error?: string; // For error events
    [key: string]: any;
  };
}

// Plugin Execution Result
export interface PluginExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  events?: PluginEvent[];
  cost_cents?: number;
  execution_time_ms?: number;
  metadata?: { [key: string]: any };
}

// Create Plugin Request
export interface CreatePluginRequest {
  name: string;
  display_name: string;
  description?: string;
  version?: string;
  author?: string;
  plugin_type: PluginType;
  runtime_type: RuntimeType;
  manifest: PluginManifest;
  config_schema?: PluginConfigSchema;
  is_public?: boolean;
}

// Update Plugin Request
export interface UpdatePluginRequest {
  display_name?: string;
  description?: string;
  version?: string;
  author?: string;
  plugin_type?: PluginType;
  runtime_type?: RuntimeType;
  manifest?: PluginManifest;
  config_schema?: PluginConfigSchema;
  is_active?: boolean;
  is_public?: boolean;
}

// Plugin Config Request
export interface PluginConfigRequest {
  plugin_id: string;
  user_id?: string; // NULL for global config
  config_data: { [key: string]: any };
}

// Assistant Plugin Assignment Request
export interface AssistantPluginRequest {
  assistant_id: string;
  plugin_id: string;
  is_enabled?: boolean;
  sort_order?: number;
  config_override?: { [key: string]: any };
}

// Plugin Function Call Request
export interface PluginFunctionCallRequest {
  plugin_id: string;
  function_name: string;
  parameters: { [key: string]: any };
  assistant_id?: string;
  conversation_id?: string;
}

// Utility Functions
export const createPluginManifest = (data: Partial<PluginManifest>): PluginManifest => {
  return {
    name: data.name || '',
    display_name: data.display_name || '',
    version: data.version || '1.0.0',
    description: data.description,
    author: data.author,
    runtime: data.runtime || 'api_call',
    functions: data.functions || [],
    config_schema: data.config_schema,
    endpoints: data.endpoints,
    requirements: data.requirements,
    permissions: data.permissions,
    metadata: data.metadata,
  };
};

export const validatePluginManifest = (manifest: PluginManifest): string[] => {
  const errors: string[] = [];
  
  if (!manifest.name) errors.push('Plugin name is required');
  if (!manifest.display_name) errors.push('Plugin display name is required');
  if (!manifest.version) errors.push('Plugin version is required');
  if (!manifest.runtime) errors.push('Plugin runtime is required');
  if (!manifest.functions || manifest.functions.length === 0) {
    errors.push('Plugin must have at least one function');
  }
  
  // Validate functions
  manifest.functions?.forEach((func, index) => {
    if (!func.name) errors.push(`Function ${index}: name is required`);
    if (!func.description) errors.push(`Function ${index}: description is required`);
    if (!func.parameters) errors.push(`Function ${index}: parameters are required`);
  });
  
  return errors;
};

export const generatePluginId = (): string => {
  return uuidv4();
};

export const generatePluginConfigId = (): string => {
  return uuidv4();
};

export const generateAssistantPluginId = (): string => {
  return uuidv4();
};

export const generatePluginExecutionId = (): string => {
  return uuidv4();
}; 