/**
 * Shared type definitions for the database module.
 *
 * All interfaces previously defined inline inside DatabaseManager.ts
 * are now re-exported from this single location.
 */

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  path?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface MessageRecord {
  id?: number;
  messageId: string;
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: Date;
  provider: string;
  metadata?: Record<string, unknown>;
}

// Provider configuration interfaces for type safety
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

export interface MCPCGuardConfig {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUserIds?: string[];
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

export interface ConversationSummary {
  id?: number;
  channelId: string;
  summary: string;
  messageCount: number;
  startTimestamp: Date;
  endTimestamp: Date;
  provider: string;
}

export interface BotMetrics {
  id?: number;
  botName: string;
  messagesSent: number;
  messagesReceived: number;
  conversationsHandled: number;
  averageResponseTime: number;
  lastActivity: Date;
  provider: string;
}

export interface BotConfiguration {
  id?: number;
  name: string;
  messageProvider: string;
  llmProvider: string;
  llmProfile?: string;
  responseProfile?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: { name: string; serverUrl?: string }[] | string[] | string;
  mcpGuard?: MCPCGuardConfig | string;
  mcpGuardProfile?: string;
  discord?: DiscordConfig | string;
  slack?: SlackConfig | string;
  mattermost?: MattermostConfig | string;
  openai?: OpenAIConfig | string;
  flowise?: FlowiseConfig | string;
  openwebui?: OpenWebUIConfig | string;
  openswarm?: OpenSwarmConfig | string;
  perplexity?: PerplexityConfig | string;
  replicate?: ReplicateConfig | string;
  n8n?: N8nConfig | string;
  tenantId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface BotConfigurationVersion {
  id?: number;
  botConfigurationId: number;
  version: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: { name: string; serverUrl?: string }[] | string[] | string;
  mcpGuard?: MCPCGuardConfig | string;
  discord?: DiscordConfig | string;
  slack?: SlackConfig | string;
  mattermost?: MattermostConfig | string;
  openai?: OpenAIConfig | string;
  flowise?: FlowiseConfig | string;
  openwebui?: OpenWebUIConfig | string;
  openswarm?: OpenSwarmConfig | string;
  perplexity?: PerplexityConfig | string;
  replicate?: ReplicateConfig | string;
  n8n?: N8nConfig | string;
  tenantId?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
  changeLog?: string;
}

export interface BotConfigurationAudit {
  id?: number;
  botConfigurationId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  oldValues?: string;
  newValues?: string;
  performedBy?: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxBots: number;
  maxUsers: number;
  storageQuota: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  roleId: number;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuditEvent {
  id: number;
  timestamp: Date;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'debug';
  status: 'success' | 'failure' | 'pending';
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  resolved: boolean;
  tenantId?: string;
}

export interface ApprovalRequest {
  id?: number;
  resourceType: string;
  resourceId: number;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  requestedBy: string;
  diff?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  createdAt: Date;
  tenantId?: string;
}

export interface AIFeedback {
  id?: number;
  recommendationId: string;
  feedback: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
