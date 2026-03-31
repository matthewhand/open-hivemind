export interface FieldMetadata {
  source: 'env' | 'user' | 'default';
  locked: boolean;
  envVar?: string;
  override?: boolean;
}

export interface BotMetadata {
  messageProvider?: FieldMetadata;
  llmProvider?: FieldMetadata;
  llmProfile?: FieldMetadata;
  responseProfile?: FieldMetadata;
  persona?: FieldMetadata;
  systemInstruction?: FieldMetadata;
  mcpServers?: FieldMetadata;
  mcpGuard?: FieldMetadata;
  mcpGuardProfile?: FieldMetadata;
}

// Provider-specific configuration interfaces
export interface DiscordConfig {
  channelId?: string;
  guildId?: string;
  token?: string;
  prefix?: string;
  intents?: string[];
}

export interface SlackConfig {
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
  teamId?: string;
  channels?: string[];
}

export interface MattermostConfig {
  url?: string;
  accessToken?: string;
  teamId?: string;
  channelId?: string;
}

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  organization?: string;
}

export interface FlowiseConfig {
  apiUrl?: string;
  apiKey?: string;
  chatflowId?: string;
}

export interface OpenWebUIConfig {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface OpenSwarmConfig {
  apiUrl?: string;
  apiKey?: string;
  swarmId?: string;
}

export interface PerplexityConfig {
  apiKey?: string;
  model?: string;
}

export interface ReplicateConfig {
  apiKey?: string;
  model?: string;
  version?: string;
}

export interface N8nConfig {
  apiUrl?: string;
  apiKey?: string;
  workflowId?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'customer_service' | 'creative' | 'technical' | 'educational' | 'entertainment' | 'professional';
  traits: Array<{ name: string; value: string; weight?: number; type?: string }>;
  systemPrompt: string;
  isBuiltIn?: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Union type for all provider configs
export type ProviderConfig =
  | DiscordConfig
  | SlackConfig
  | MattermostConfig
  | OpenAIConfig
  | FlowiseConfig
  | OpenWebUIConfig
  | OpenSwarmConfig
  | PerplexityConfig
  | ReplicateConfig
  | N8nConfig;

export interface Bot {
  name: string;
  messageProvider: string;
  llmProvider: string;
  llmProfile?: string;
  responseProfile?: string;
  mcpGuardProfile?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: Array<{ name: string; serverUrl?: string }> | string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  discord?: DiscordConfig;
  slack?: SlackConfig;
  mattermost?: MattermostConfig;
  openai?: OpenAIConfig;
  flowise?: FlowiseConfig;
  openwebui?: OpenWebUIConfig;
  openswarm?: OpenSwarmConfig;
  perplexity?: PerplexityConfig;
  replicate?: ReplicateConfig;
  n8n?: N8nConfig;
  metadata?: BotMetadata;
}

export interface ConfigResponse {
  bots: Bot[];
  warnings: string[];
  legacyMode: boolean;
  environment: string;
}

export interface StatusResponse {
  bots: Array<{
    name: string;
    provider: string;
    llmProvider: string;
    status: string;
    healthDetails?: any;
    connected?: boolean;
    messageCount?: number;
    errorCount?: number;
  }>;
  uptime: number;
}

export interface ConfigFile {
  path: string;
  size: number;
  lastModified: string;
  exists: boolean;
}

export interface ConfigOverride {
  key: string;
  value: unknown;
  source: 'cli' | 'env' | 'file';
  timestamp: string;
}

export interface ConfigSourcesResponse {
  environmentVariables: Record<string, string>;
  configFiles: ConfigFile[];
  overrides: ConfigOverride[];
}

export interface SecureConfig {
  id: string;
  name: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
}

export interface HotReloadRequest {
  type: 'create' | 'update' | 'delete';
  botName?: string;
  changes: Record<string, unknown>;
}

export interface HotReloadResponse {
  success: boolean;
  message: string;
  affectedBots: string[];
  warnings: string[];
  errors: string[];
  rollbackId?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

export interface ActivityTimelineBucket {
  timestamp: string;
  messageProviders: Record<string, number>;
  llmProviders: Record<string, number>;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    agents: string[];
    messageProviders: string[];
    llmProviders: string[];
  };
  timeline: ActivityTimelineBucket[];
  agentMetrics: Array<{
    botName: string;
    messageProvider: string;
    llmProvider: string;
    events: number;
    errors: number;
    lastActivity: string;
    totalMessages: number;
    recentErrors: string[];
    avgResponseTime?: number;
    minResponseTime?: number;
    maxResponseTime?: number;
    p95ResponseTime?: number;
    p99ResponseTime?: number;
  }>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

export type RateLimitListener = (info: RateLimitInfo) => void;
