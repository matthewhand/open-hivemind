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
    /** LLM provider profile name */
    llmProfile?: string;
    /** Response profile name */
    responseProfile?: string;
    /** MCP guardrail profile name */
    mcpGuardProfile?: string;
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
    /** LLM provider profile */
    LLM_PROFILE: {
        doc: string;
        format: StringConstructor;
        default: string;
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
/**
 * Type guard for Discord configuration
 */
export declare function isDiscordConfig(obj: unknown): obj is DiscordConfig;
/**
 * Type guard for Slack configuration
 */
export declare function isSlackConfig(obj: unknown): obj is SlackConfig;
/**
 * Type guard for Mattermost configuration
 */
export declare function isMattermostConfig(obj: unknown): obj is MattermostConfig;
/**
 * Type guard for OpenAI configuration
 */
export declare function isOpenAIConfig(obj: unknown): obj is OpenAIConfig;
/**
 * Type guard for Flowise configuration
 */
export declare function isFlowiseConfig(obj: unknown): obj is FlowiseConfig;
/**
 * Type guard for bot configuration
 */
export declare function isBotConfig(obj: unknown): obj is BotConfig;
/**
 * Type guard for secure configuration
 */
export declare function isSecureConfig(obj: unknown): obj is SecureConfig;
/**
 * Type guard for MCP server configuration
 */
export declare function isMcpServerConfig(obj: unknown): obj is McpServerConfig;
/**
 * Type guard for MCP guard configuration
 */
export declare function isMcpGuardConfig(obj: unknown): obj is McpGuardConfig;
/**
 * Union type for all platform configurations
 */
export type PlatformConfig = DiscordConfig | SlackConfig | MattermostConfig;
/**
 * Union type for all LLM provider configurations
 */
export type LlmProviderConfig = OpenAIConfig | FlowiseConfig | OpenWebUIConfig | OpenSwarmConfig;
/**
 * Union type for all configuration types
 */
export type AnyConfig = BotConfig | SecureConfig | PlatformConfig | LlmProviderConfig;
/**
 * Configuration environment type
 */
export type ConfigEnvironment = 'development' | 'production' | 'test';
/**
 * Default configuration values
 */
export declare const CONFIG_DEFAULTS: {
    readonly MESSAGE_PROVIDER: MessageProvider;
    readonly LLM_PROVIDER: LlmProvider;
    readonly PERSONA: "default";
    readonly SYSTEM_INSTRUCTION: "";
    readonly SLACK_MODE: SlackMode;
    readonly OPENAI_MODEL: "gpt-4";
    readonly OPENAI_BASE_URL: "https://api.openai.com/v1";
    readonly FLOWISE_API_BASE_URL: "http://localhost:3000/api/v1";
    readonly OPENWEBUI_API_URL: "http://localhost:3000/api/";
    readonly OPENSWARM_BASE_URL: "http://localhost:8000/v1";
    readonly OPENSWARM_TEAM: "default-team";
};
/**
 * Configuration validation patterns
 */
export declare const CONFIG_PATTERNS: {
    readonly BOT_NAME: RegExp;
    readonly DISCORD_TOKEN: RegExp;
    readonly SLACK_BOT_TOKEN: RegExp;
    readonly SLACK_APP_TOKEN: RegExp;
    readonly SLACK_SIGNING_SECRET: RegExp;
    readonly OPENAI_API_KEY: RegExp;
};
/**
 * Configuration file extensions
 */
export declare const CONFIG_EXTENSIONS: {
    readonly JSON: ".json";
    readonly ENCRYPTED: ".enc";
    readonly BACKUP: ".json";
};
//# sourceMappingURL=config.d.ts.map