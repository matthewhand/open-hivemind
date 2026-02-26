"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_EXTENSIONS = exports.CONFIG_PATTERNS = exports.CONFIG_DEFAULTS = void 0;
exports.isDiscordConfig = isDiscordConfig;
exports.isSlackConfig = isSlackConfig;
exports.isMattermostConfig = isMattermostConfig;
exports.isOpenAIConfig = isOpenAIConfig;
exports.isFlowiseConfig = isFlowiseConfig;
exports.isBotConfig = isBotConfig;
exports.isSecureConfig = isSecureConfig;
exports.isMcpServerConfig = isMcpServerConfig;
exports.isMcpGuardConfig = isMcpGuardConfig;
// ============================================================================
// Type Guards
// ============================================================================
/**
 * Type guard for Discord configuration
 */
function isDiscordConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'token' in obj &&
        typeof obj.token === 'string');
}
/**
 * Type guard for Slack configuration
 */
function isSlackConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'botToken' in obj &&
        'signingSecret' in obj &&
        typeof obj.botToken === 'string' &&
        typeof obj.signingSecret === 'string');
}
/**
 * Type guard for Mattermost configuration
 */
function isMattermostConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'serverUrl' in obj &&
        'token' in obj &&
        typeof obj.serverUrl === 'string' &&
        typeof obj.token === 'string');
}
/**
 * Type guard for OpenAI configuration
 */
function isOpenAIConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'apiKey' in obj &&
        typeof obj.apiKey === 'string');
}
/**
 * Type guard for Flowise configuration
 */
function isFlowiseConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'apiKey' in obj &&
        typeof obj.apiKey === 'string');
}
/**
 * Type guard for bot configuration
 */
function isBotConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'name' in obj &&
        'messageProvider' in obj &&
        'llmProvider' in obj &&
        typeof obj.name === 'string' &&
        typeof obj.messageProvider === 'string' &&
        typeof obj.llmProvider === 'string');
}
/**
 * Type guard for secure configuration
 */
function isSecureConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'type' in obj &&
        'data' in obj &&
        'createdAt' in obj &&
        'updatedAt' in obj &&
        'checksum' in obj &&
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.type === 'string' &&
        typeof obj.data === 'object' &&
        typeof obj.createdAt === 'string' &&
        typeof obj.updatedAt === 'string' &&
        typeof obj.checksum === 'string');
}
/**
 * Type guard for MCP server configuration
 */
function isMcpServerConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'name' in obj &&
        typeof obj.name === 'string');
}
/**
 * Type guard for MCP guard configuration
 */
function isMcpGuardConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'enabled' in obj &&
        'type' in obj &&
        typeof obj.enabled === 'boolean' &&
        typeof obj.type === 'string');
}
// ============================================================================
// Constants
// ============================================================================
/**
 * Default configuration values
 */
exports.CONFIG_DEFAULTS = {
    MESSAGE_PROVIDER: 'discord',
    LLM_PROVIDER: 'flowise',
    PERSONA: 'default',
    SYSTEM_INSTRUCTION: '',
    SLACK_MODE: 'socket',
    OPENAI_MODEL: 'gpt-4',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    FLOWISE_API_BASE_URL: 'http://localhost:3000/api/v1',
    OPENWEBUI_API_URL: 'http://localhost:3000/api/',
    OPENSWARM_BASE_URL: 'http://localhost:8000/v1',
    OPENSWARM_TEAM: 'default-team',
};
/**
 * Configuration validation patterns
 */
exports.CONFIG_PATTERNS = {
    BOT_NAME: /^[a-zA-Z0-9_-]+$/,
    DISCORD_TOKEN: /^[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}$/,
    SLACK_BOT_TOKEN: /^xoxb-[A-Za-z0-9-]+$/,
    SLACK_APP_TOKEN: /^xapp-[A-Za-z0-9-]+$/,
    SLACK_SIGNING_SECRET: /^[A-Za-z0-9]+$/,
    OPENAI_API_KEY: /^sk-[A-Za-z0-9]+$/,
};
/**
 * Configuration file extensions
 */
exports.CONFIG_EXTENSIONS = {
    JSON: '.json',
    ENCRYPTED: '.enc',
    BACKUP: '.json',
};
