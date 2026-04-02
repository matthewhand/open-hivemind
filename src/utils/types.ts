/**
 * Consolidated type definitions
 */

// Configuration Manager types
export interface ConfigurationManager {
  get(key: string): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
}

// LLM Provider types
export interface LLMProvider {
  name: string;
  generateChatCompletion(message: string, history: any[], config?: any): Promise<string>;
  generateCompletion(message: string, config?: any): Promise<string>;
}

export interface LLMResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

// Message types
export interface MessageMetadata {
  timestamp: string;
  channelId: string;
  userId: string;
  botId?: string;
  platform: 'discord' | 'slack' | 'telegram' | 'mattermost';
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  signature?: string;
}

export interface WebhookHandler {
  handle(payload: WebhookPayload): Promise<void>;
}

// Database types
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface MessageRecord {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
  platform: string;
  metadata?: Record<string, any>;
}

// Monitoring types
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

// Error types
export interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => ValidationResult;
  required?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration types
export interface BotConfiguration {
  name: string;
  platform: 'discord' | 'slack' | 'telegram' | 'mattermost';
  token: string;
  llmProvider?: string;
  channels?: string[];
  features?: Record<string, boolean>;
  metadata?: Record<string, any>;
}

export interface PlatformConfiguration {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  credentials?: Record<string, string>;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];
