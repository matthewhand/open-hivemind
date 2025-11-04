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
export type LlmProvider = 'openai' | 'flowise' | 'openwebui' | 'perplexity' | 'replicate' | 'n8n' | 'openswarm';

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
  /** Additional guard settings */
  settings?: Record<string, unknown>;
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
  /** Bot persona key */
  persona?: string;
  /** Bot system instruction/prompt */
  systemInstruction?: string;
  /** MCP servers configuration */
  mcpServers?: McpServerConfig[];
  /** MCP tool usage guard configuration */
  mcpGuard?: McpGuardConfig;
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
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Bot configuration schema for validation
 */
export interface BotConfigSchema {
  /** Message provider configuration */
  MESSAGE_PROVIDER: {
    doc: string;
    format: MessageProvider[];
    default: MessageProvider;
    env: string;
  };
  
  /** LLM provider configuration */
  LLM_PROVIDER: {
    doc: string;
    format: LlmProvider[];
    default: LlmProvider;
    env: string;
  };
  
  /** Persona configuration */
  PERSONA: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** System instruction configuration */
  SYSTEM_INSTRUCTION: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** MCP servers configuration */
  MCP_SERVERS: {
    doc: string;
    format: ArrayConstructor;
    default: McpServerConfig[];
    env: string;
  };
  
  /** MCP guard configuration */
  MCP_GUARD: {
    doc: string;
    format: ObjectConstructor;
    default: McpGuardConfig;
    env: string;
  };
  
  /** Discord-specific configurations */
  DISCORD_BOT_TOKEN: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  DISCORD_CLIENT_ID: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  DISCORD_GUILD_ID: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  DISCORD_CHANNEL_ID: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  DISCORD_VOICE_CHANNEL_ID: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };

  /** Slack-specific configurations */
  SLACK_BOT_TOKEN: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  SLACK_APP_TOKEN: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  SLACK_SIGNING_SECRET: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  SLACK_JOIN_CHANNELS: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  SLACK_DEFAULT_CHANNEL_ID: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  SLACK_MODE: {
    doc: string;
    format: SlackMode[];
    default: SlackMode;
    env: string;
  };

  /** Mattermost-specific configurations */
  MATTERMOST_SERVER_URL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  MATTERMOST_TOKEN: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  MATTERMOST_CHANNEL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** OpenAI configurations */
  OPENAI_API_KEY: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  OPENAI_MODEL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  OPENAI_BASE_URL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** Flowise configurations */
  FLOWISE_API_KEY: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  FLOWISE_API_BASE_URL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** OpenWebUI configurations */
  OPENWEBUI_API_KEY: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  OPENWEBUI_API_URL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  /** OpenSwarm configurations */
  OPENSWARM_BASE_URL: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  OPENSWARM_API_KEY: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
  
  OPENSWARM_TEAM: {
    doc: string;
    format: StringConstructor;
    default: string;
    env: string;
  };
}

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
export interface FullBackupData {
  /** Backup metadata */
  metadata: BackupMetadata;
  /** Configuration data */
  data: Record<string, SecureConfig>;
}

/**
 * Encryption data structure
 */
export interface EncryptionData {
  /** Initialization vector */
  iv: string;
  /** Authentication tag */
  authTag: string;
  /** Encrypted data */
  data: string;
}

// ============================================================================
// Configuration Management Types
// ============================================================================

/**
 * Configuration change event
 */
export interface ConfigurationChange {
  /** Change ID */
  id: string;
  /** Configuration name */
  name: string;
  /** Change type */
  type: 'create' | 'update' | 'delete';
  /** Change timestamp */
  timestamp: string;
  /** Previous configuration (for updates) */
  previous?: SecureConfig;
  /** New configuration (for creates/updates) */
  current?: SecureConfig;
}

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
  /** Message provider override */
  messageProvider?: MessageProvider;
  /** LLM provider override */
  llmProvider?: LlmProvider;
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
export interface ConfigManagerMetrics {
  /** Number of configured bots */
  botCount: number;
  /** Number of secure configurations */
  secureConfigCount: number;
  /** Number of backups */
  backupCount: number;
  /** Last configuration reload timestamp */
  lastReload?: string;
  /** Configuration warnings */
  warnings: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Discord configuration
 */
export function isDiscordConfig(obj: unknown): obj is DiscordConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'token' in obj &&
    typeof (obj as DiscordConfig).token === 'string'
  );
}

/**
 * Type guard for Slack configuration
 */
export function isSlackConfig(obj: unknown): obj is SlackConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'botToken' in obj &&
    'signingSecret' in obj &&
    typeof (obj as SlackConfig).botToken === 'string' &&
    typeof (obj as SlackConfig).signingSecret === 'string'
  );
}

/**
 * Type guard for Mattermost configuration
 */
export function isMattermostConfig(obj: unknown): obj is MattermostConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'serverUrl' in obj &&
    'token' in obj &&
    typeof (obj as MattermostConfig).serverUrl === 'string' &&
    typeof (obj as MattermostConfig).token === 'string'
  );
}

/**
 * Type guard for OpenAI configuration
 */
export function isOpenAIConfig(obj: unknown): obj is OpenAIConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'apiKey' in obj &&
    typeof (obj as OpenAIConfig).apiKey === 'string'
  );
}

/**
 * Type guard for Flowise configuration
 */
export function isFlowiseConfig(obj: unknown): obj is FlowiseConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'apiKey' in obj &&
    typeof (obj as FlowiseConfig).apiKey === 'string'
  );
}

/**
 * Type guard for bot configuration
 */
export function isBotConfig(obj: unknown): obj is BotConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'messageProvider' in obj &&
    'llmProvider' in obj &&
    typeof (obj as BotConfig).name === 'string' &&
    typeof (obj as BotConfig).messageProvider === 'string' &&
    typeof (obj as BotConfig).llmProvider === 'string'
  );
}

/**
 * Type guard for secure configuration
 */
export function isSecureConfig(obj: unknown): obj is SecureConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'type' in obj &&
    'data' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    'checksum' in obj &&
    typeof (obj as SecureConfig).id === 'string' &&
    typeof (obj as SecureConfig).name === 'string' &&
    typeof (obj as SecureConfig).type === 'string' &&
    typeof (obj as SecureConfig).data === 'object' &&
    typeof (obj as SecureConfig).createdAt === 'string' &&
    typeof (obj as SecureConfig).updatedAt === 'string' &&
    typeof (obj as SecureConfig).checksum === 'string'
  );
}

/**
 * Type guard for MCP server configuration
 */
export function isMcpServerConfig(obj: unknown): obj is McpServerConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as McpServerConfig).name === 'string'
  );
}

/**
 * Type guard for MCP guard configuration
 */
export function isMcpGuardConfig(obj: unknown): obj is McpGuardConfig {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'enabled' in obj &&
    'type' in obj &&
    typeof (obj as McpGuardConfig).enabled === 'boolean' &&
    typeof (obj as McpGuardConfig).type === 'string'
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Union type for all platform configurations
 */
export type PlatformConfig = 
  | DiscordConfig 
  | SlackConfig 
  | MattermostConfig;

/**
 * Union type for all LLM provider configurations
 */
export type LlmProviderConfig = 
  | OpenAIConfig 
  | FlowiseConfig 
  | OpenWebUIConfig 
  | OpenSwarmConfig;

/**
 * Union type for all configuration types
 */
export type AnyConfig = 
  | BotConfig 
  | SecureConfig 
  | PlatformConfig 
  | LlmProviderConfig;

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