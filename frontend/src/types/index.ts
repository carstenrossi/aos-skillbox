// Language support
export type SupportedLanguage = 'de' | 'en';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Skillbox types
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
  created_at: string;
  updated_at: string;
}

export interface SkillboxTheme {
  primary_color: string;
  secondary_color: string;
  background_gradient: string[];
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
}

// Assistant types
export interface Assistant {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  api_url: string;
  model_name: string;
  system_prompt: string;
  capabilities: AssistantCapability[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Chat types
export interface Conversation {
  id: string;
  user_id: string;
  skillbox_id: string;
  assistant_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: MessageFile[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MessageFile {
  id: string;
  message_id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  url: string;
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

// Backend-specific response types
export interface ConversationResponse {
  success: boolean;
  conversation?: {
    id: string;
    assistantId: string;
    title: string;
    created: string;
  };
  error?: string;
}

export interface MessageResponse {
  success: boolean;
  message?: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    conversationId: string;
    model?: string;
    assistantType?: string;
  };
  conversationId?: string;
  error?: string;
}

// UI State types
export interface ChatState {
  conversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  skillbox: Skillbox | null;
  assistants: Assistant[];
  currentChat: ChatState;
  language: SupportedLanguage;
  theme: 'light' | 'dark';
}

// Component props types
export interface AvatarCardProps {
  assistant: Assistant;
  onClick: (assistant: Assistant) => void;
  isLoading?: boolean;
  className?: string;
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistant: Assistant | null;
  conversation: Conversation | null;
}

export interface MessageProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

export interface FileUploadProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}

export interface LanguageSwitcherProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  className?: string;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name?: string;
  last_name?: string;
}

export interface ChatInputData {
  message: string;
  files: File[];
}

// Error types
export interface FormError {
  field: string;
  message: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary';
}

// Settings types
export interface UserSettings {
  language: SupportedLanguage;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    allowAnalytics: boolean;
  };
}

// Analytics types
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  user_id?: string;
  timestamp?: string;
}

// File handling
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// PWA types
export interface PWAInstallPrompt {
  platforms: string[];
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Configuration types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    fileUpload: boolean;
    darkMode: boolean;
    analytics: boolean;
    pwa: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFilesPerMessage: number;
    messageMaxLength: number;
  };
}

// Local storage types
export interface StorageKeys {
  AUTH_TOKEN: 'auth_token';
  REFRESH_TOKEN: 'refresh_token';
  USER_SETTINGS: 'user_settings';
  LANGUAGE: 'language';
  THEME: 'theme';
  SKILLBOX_CONFIG: 'skillbox_config';
}

// Plugin interfaces (Phase 2: Frontend Integration)
export interface Plugin {
  id: string;
  name: string;
  display_name: string;
  description: string;
  version: string;
  author: string;
  plugin_type: 'image_generation' | 'video_generation' | 'audio_generation' | 'automation' | 'utility';
  runtime_type: 'api_call' | 'nodejs' | 'webhook';
  config_schema: any;
  manifest: PluginManifest;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PluginManifest {
  name: string;
  display_name: string;
  description: string;
  version: string;
  author: string;
  plugin_type: string;
  runtime_type: string;
  functions: PluginFunction[];
  config_schema?: any;
  dependencies?: string[];
}

export interface PluginFunction {
  name: string;
  display_name: string;
  description: string;
  parameters: PluginParameter[];
  returns?: {
    type: string;
    description: string;
  };
}

export interface PluginParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
  enum?: any[];
}

export interface PluginConfig {
  id: string;
  plugin_id: string;
  user_id?: string;
  config_data: any;
  created_at: string;
  updated_at: string;
}

export interface AssistantPlugin {
  id: string;
  assistant_id: string;
  plugin_id: string;
  sort_order: number;
  config_override?: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PluginExecution {
  id: string;
  plugin_id: string;
  function_name: string;
  user_id: string;
  assistant_id?: string;
  conversation_id?: string;
  parameters: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  cost_credits?: number;
  created_at: string;
  updated_at: string;
} 