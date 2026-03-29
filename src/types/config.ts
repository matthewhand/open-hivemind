/**
 * Configuration Types
 *
 * This file contains TypeScript interfaces and types for bot configurations
 * and MCP server configs, replacing 'any' usage in configuration management.
 *
 * Based on analysis of:
 * - src/config/BotConfigurationManager.ts
 * - src/config/SecureConfigManager.ts
 */

// ============================================================================
// Bot Configuration Types
// ============================================================================

/**
 * Message provider types
 */
export type MessageProvider = 'discord' | 'slack' | 'mattermost' | 'webhook';

/**
 * LLM provider types
 */
export type LlmProvider =
  | 'openai'
  | 'flowise'
  | 'openwebui'
  | 'perplexity'
  | 'replicate'
  | 'n8n'
  | 'openswarm'
  | 'letta';

/**
 * Slack connection modes
 */
export type SlackMode = 'socket' | 'rtm';

/**
 * MCP guard types
 */
export type McpGuardType = 'owner' | 'custom';

/**
 * Configuration types
 */
export type ConfigType = 'bot' | 'user' | 'system';

/**
 * Discord configuration
 */
export interface DiscordConfig {
  /** Discord bot token */
  token: string;
  /** Discord client ID */
  clientId?: string;
  /** Discord guild ID */
  guildId?: string;
  /** Default Discord channel ID */
  channelId?: string;
  /** Discord voice channel ID */
  voiceChannelId?: string;
}

/**
 * Slack configuration
 */
export interface SlackConfig {
  /** Slack bot token */
  botToken: string;
  /** Slack app token for Socket Mode */
  appToken?: string;
  /** Slack signing secret for verifying requests */
  signingSecret: string;
  /** Comma-separated Slack channel IDs to join */
  joinChannels?: string;
  /** Default Slack channel ID for messages */
  defaultChannelId?: string;
  /** Slack connection mode */
  mode?: SlackMode;
}

/**
 * Mattermost configuration
 */
export interface MattermostConfig {
  /** Mattermost server endpoint */
  serverUrl: string;
  /** Mattermost authentication token */
  token: string;
  /** Default Mattermost channel for messages */
  channel?: string;
}

/**
 * OpenAI configuration
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** OpenAI model name */
  model?: string;
  /** OpenAI API base URL */
  baseUrl?: string;
  /** OpenAI system prompt */
  systemPrompt?: string;
}

/**
 * Flowise configuration
 */
export interface FlowiseConfig {
  /** Flowise API key */
  apiKey: string;
  /** Flowise API base URL */
  apiBaseUrl?: string;
}

/**
 * OpenWebUI configuration
 */
export interface OpenWebUIConfig {
  /** OpenWebUI API key */
  apiKey: string;
  /** OpenWebUI API URL */
  apiUrl?: string;
}

/**
 * OpenSwarm configuration
 */
export interface OpenSwarmConfig {
  /** OpenSwarm API base URL */
  baseUrl?: string;
  /** OpenSwarm API key */
  apiKey?: string;
  /** OpenSwarm team name */
  team?: string;
}

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  /** Server name */
  name: string;
  /** Server endpoint URL */
  serverUrl: string;
  /** Authentication credentials */
  credentials?: Record<string, string>;
  /** Server configuration */
  config?: Record<string, unknown>;
  /** Whether server is enabled */
  enabled?: boolean;
}

/**
 * MCP guard configuration
 */
export interface McpGuardConfig {
  /** Whether guard is enabled */
  enabled: boolean;
  /** Guard type */
  type: McpGuardType;
  /** List of allowed user IDs (for userlist type) */
  allowedUsers?: string[];
  /** List of allowed MCP tools (by name) */
  allowedTools?: string[];
  /** Additional guard settings */
  settings?: Record<string, unknown>;
}

/**
 * Content filter configuration
 */
export interface ContentFilterConfig {
  /** Whether content filter is enabled */
  enabled: boolean;
  /** Strictness level */
  strictness?: 'low' | 'medium' | 'high';
  /** List of specific blocked terms/phrases */
  blockedTerms?: string[];
}

/**
 * Bot configuration interface
 */
export interface BotConfig {
  /** Bot name */
  name: string;
  /** Message provider type */
  messageProvider: MessageProvider;
  /** LLM provider type */
  llmProvider: LlmProvider;
  /** LLM provider profile name */
  llmProfile?: string;
  /** Response profile name */
  responseProfile?: string;
  /** MCP guardrail profile name */
  mcpGuardProfile?: string;
  /** MCP server profile name */
  mcpServerProfile?: string;
  /** Memory provider profile name for conversation memory */
  memoryProfile?: string;
  /** Bot persona key */
  persona?: string;
  /** Bot system instruction/prompt */
  systemInstruction?: string;
  /** MCP servers configuration */
  mcpServers?: McpServerConfig[];
  /** MCP tool usage guard configuration */
  mcpGuard?: McpGuardConfig;
  /** Tool profile keys listing which tool profiles to enable for this bot */
  toolProfiles?: string[];
  /** Rate limiter configuration */
  rateLimit?: {
    enabled: boolean;
    maxRequests?: number;
    windowMs?: number;
  };
  /** Content filter configuration */
  contentFilter?: ContentFilterConfig;
  /** Discord-specific configuration */
  discord?: DiscordConfig;
  /** Slack-specific configuration */
  slack?: SlackConfig;
  /** Mattermost-specific configuration */
  mattermost?: MattermostConfig;
  /** OpenAI configuration */
  openai?: OpenAIConfig;
  /** Flowise configuration */
  flowise?: FlowiseConfig;
  /** OpenWebUI configuration */
  openwebui?: OpenWebUIConfig;
  /** OpenSwarm configuration */
  openswarm?: OpenSwarmConfig;
  /** Letta configuration */
  letta?: LettaConfig;
  /** Whether the bot is enabled */
  enabled?: boolean;
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Bot configuration schema for validation
 */

// ============================================================================
// Secure Configuration Types
// ============================================================================

/**
 * Secure configuration interface
 */
export interface SecureConfig {
  /** Configuration ID */
  id: string;
  /** Configuration name */
  name: string;
  /** Configuration type */
  type: ConfigType;
  /** Configuration data */
  data: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Data integrity checksum */
  checksum: string;
}

/**
 * Backup metadata interface
 */
export interface BackupMetadata {
  /** Backup ID */
  id: string;
  /** Backup timestamp */
  timestamp: string;
  /** Configuration IDs included in backup */
  configs: string[];
  /** Backup checksum */
  checksum: string;
  /** Backup version */
  version: string;
}

/**
 * Full backup data structure
 */

/**
 * Encryption data structure
 */

// ============================================================================
// Configuration Management Types
// ============================================================================

/**
 * Configuration change event
 */

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  /** Whether configuration is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Configuration override interface
 */
export interface BotOverride {
  /** Whether bot is disabled */
  disabled?: boolean;
  /** Message provider override */
  messageProvider?: MessageProvider;
  /** LLM provider override */
  llmProvider?: LlmProvider;
  /** LLM provider profile override */
  llmProfile?: string;
  /** Response profile override */
  responseProfile?: string;
  /** MCP guardrail profile override */
  mcpGuardProfile?: string;
  /** MCP server profile override */
  mcpServerProfile?: string;
  /** Memory provider profile override */
  memoryProfile?: string;
  /** Persona override */
  persona?: string;
  /** System instruction override */
  systemInstruction?: string;
  /** MCP servers override */
  mcpServers?: McpServerConfig[];
  /** MCP guard override */
  mcpGuard?: McpGuardConfig;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Configuration manager metrics
 */

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Discord configuration
 */

/**
 * Type guard for Slack configuration
 */

/**
 * Type guard for Mattermost configuration
 */

/**
 * Type guard for OpenAI configuration
 */

/**
 * Type guard for Flowise configuration
 */

/**
 * Type guard for bot configuration
 */

/**
 * Type guard for secure configuration
 */

/**
 * Type guard for MCP server configuration
 */

/**
 * Type guard for MCP guard configuration
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Union type for all platform configurations
 */
export type PlatformConfig = DiscordConfig | SlackConfig | MattermostConfig;

/**
 * Letta session mode - determines how conversation sessions are scoped
 */
export type LettaSessionMode = 'default' | 'per-channel' | 'per-user' | 'fixed';

/**
 * Union type for all LLM provider configurations
 */
export interface LettaConfig {
  agentId?: string;
  systemPrompt?: string;
  sessionMode?: LettaSessionMode;
  conversationId?: string;
}

export type LlmProviderConfig =
  | OpenAIConfig
  | FlowiseConfig
  | OpenWebUIConfig
  | OpenSwarmConfig
  | LettaConfig;

/**
 * Union type for all configuration types
 */
export type AnyConfig = BotConfig | SecureConfig | PlatformConfig | LlmProviderConfig;

/**
 * Configuration environment type
 */
export type ConfigEnvironment = 'development' | 'production' | 'test';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration values
 */
export const CONFIG_DEFAULTS = {
  MESSAGE_PROVIDER: 'discord' as MessageProvider,
  LLM_PROVIDER: 'flowise' as LlmProvider,
  PERSONA: 'default',
  SYSTEM_INSTRUCTION: '',
  SLACK_MODE: 'socket' as SlackMode,
  OPENAI_MODEL: 'gpt-4',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  FLOWISE_API_BASE_URL: 'http://localhost:3000/api/v1',
  OPENWEBUI_API_URL: 'http://localhost:3000/api/',
  OPENSWARM_BASE_URL: 'http://localhost:8000/v1',
  OPENSWARM_TEAM: 'default-team',
} as const;

/**
 * Configuration validation patterns
 */
export const CONFIG_PATTERNS = {
  BOT_NAME: /^[a-zA-Z0-9_-]+$/,
  DISCORD_TOKEN: /^[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}$/,
  SLACK_BOT_TOKEN: /^xoxb-[A-Za-z0-9-]+$/,
  SLACK_APP_TOKEN: /^xapp-[A-Za-z0-9-]+$/,
  SLACK_SIGNING_SECRET: /^[A-Za-z0-9]+$/,
  OPENAI_API_KEY: /^sk-[A-Za-z0-9]+$/,
} as const;

/**
 * Configuration file extensions
 */
export const CONFIG_EXTENSIONS = {
  JSON: '.json',
  ENCRYPTED: '.enc',
  BACKUP: '.json',
} as const;

/**
 * Configuration limits and boundaries
 */
export const CONFIG_LIMITS = {
  SYSTEM_INSTRUCTION_MAX_LENGTH: 5000,
  SYSTEM_INSTRUCTION_WARNING_LENGTH: 2000,
  SYSTEM_INSTRUCTION_MIN_LENGTH: 10,
  BOT_NAME_MIN_LENGTH: 2,
  BOT_NAME_MAX_LENGTH: 50,
  PROFILE_NAME_MAX_LENGTH: 100,
} as const;
