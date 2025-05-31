// User roles
export type UserRole = 'user' | 'manager' | 'admin';

// Role permissions mapping
export interface RolePermissions {
  canCreateSkillbox: boolean;
  canManageUsers: boolean;
  canManageAllSkillboxes: boolean;
  canViewAnalytics: boolean;
  canManageSystemSettings: boolean;
  canDeleteUsers: boolean;
  canPromoteUsers: boolean;
  maxSkillboxes: number;
  maxUsersPerSkillbox: number;
}

// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  is_active: boolean;
  is_admin: boolean; // Deprecated - use role instead, kept for compatibility
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole; // Optional, default will be 'user'
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Omit<User, 'password_hash'>;
}

// Skillbox related types
export interface Skillbox {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  subdomain: string;
  theme_config: SkillboxTheme;
  is_active: boolean;
  max_users: number;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface SkillboxTheme {
  primary_color: string;
  secondary_color: string;
  background_gradient: string[];
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
}

export interface CreateSkillboxRequest {
  name: string;
  display_name: string;
  description?: string;
  subdomain: string;
  theme_config?: Partial<SkillboxTheme>;
  max_users?: number;
}

// Assistant related types
export interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  api_key?: string;
  model_name: string;
  system_prompt: string;
  capabilities: AssistantCapability[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssistantCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface CreateAssistantRequest {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  api_key?: string;
  model_name: string;
  system_prompt: string;
  capabilities?: AssistantCapability[];
}

// Skillbox-Assistant Assignment
export interface SkillboxAssistant {
  skillbox_id: string;
  assistant_id: string;
  display_order: number;
  is_featured: boolean;
  custom_config?: Record<string, any>;
  assigned_at: Date;
}

// User-Skillbox Access
export interface UserSkillboxAccess {
  user_id: string;
  skillbox_id: string;
  role: 'user' | 'moderator' | 'admin';
  granted_at: Date;
  granted_by: string;
}

// Chat related types
export interface Conversation {
  id: string;
  user_id: string;
  skillbox_id: string;
  assistant_id: string;
  title: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: MessageFile[];
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface MessageFile {
  id: string;
  message_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

export interface CreateConversationRequest {
  skillbox_id: string;
  assistant_id: string;
  title?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  files?: Express.Multer.File[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  isAdmin: boolean; // Deprecated - use role instead, kept for compatibility
  iat: number;
  exp: number;
}

// Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// File upload types
export interface FileUploadResult {
  id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  url: string;
}

// AssistantOS API types
export interface AssistantOSChatRequest {
  model: string;
  messages: AssistantOSMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface AssistantOSMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AssistantOSChatResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Language support
export type SupportedLanguage = 'de' | 'en';

export interface LocalizedContent {
  de: string;
  en: string;
}

// Configuration types
export interface AppConfig {
  server: {
    port: number;
    host: string;
    environment: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
  };
  redis: {
    host: string;
    port: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  upload: {
    maxSize: number;
    allowedTypes: string[];
    path: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
  };
  assistantOS: {
    defaultUrl: string;
    timeout: number;
  };
  limits: {
    maxSkillboxesPerUser: number;
    maxUsersPerSkillbox: number;
    maxAssistantsPerSkillbox: number;
  };
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface DatabaseError {
  code: string;
  message: string;
  detail?: string;
  constraint?: string;
}

export type { Request } from 'express'; 