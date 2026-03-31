import type { ConfigurationValidationResult } from '@src/types/config';

export const botSchema = {
  // Message provider configuration
  MESSAGE_PROVIDER: {
    doc: 'Message provider type (discord, slack, etc.)',
    format: ['discord', 'slack', 'mattermost', 'webhook'],
    default: 'discord',
    env: 'BOTS_{name}_MESSAGE_PROVIDER',
  },

  // LLM provider configuration
  LLM_PROVIDER: {
    doc: 'LLM provider type (openai, flowise, etc.)',
    format: String,
    default: 'flowise',
    env: 'BOTS_{name}_LLM_PROVIDER',
  },

  // LLM provider profile configuration
  LLM_PROFILE: {
    doc: 'LLM provider profile name',
    format: String,
    default: '',
    env: 'BOTS_{name}_LLM_PROFILE',
  },

  // Persona configuration
  PERSONA: {
    doc: 'Bot persona key',
    format: String,
    default: 'default',
    env: 'BOTS_{name}_PERSONA',
  },

  SYSTEM_INSTRUCTION: {
    doc: 'Bot system instruction/prompt',
    format: String,
    default: '',
    env: 'BOTS_{name}_SYSTEM_INSTRUCTION',
  },

  RESPONSE_PROFILE: {
    doc: 'Response profile name for engagement/delay overrides',
    format: String,
    default: '',
    env: 'BOTS_{name}_RESPONSE_PROFILE',
  },

  MCP_SERVERS: {
    doc: 'MCP servers configuration (JSON array)',
    format: Array,
    default: [],
    env: 'BOTS_{name}_MCP_SERVERS',
  },

  MCP_GUARD: {
    doc: 'MCP tool usage guard configuration (JSON)',
    format: Object,
    default: { enabled: false, type: 'owner' },
    env: 'BOTS_{name}_MCP_GUARD',
  },

  MCP_GUARD_PROFILE: {
    doc: 'MCP guardrail profile name',
    format: String,
    default: '',
    env: 'BOTS_{name}_MCP_GUARD_PROFILE',
  },

  MCP_SERVER_PROFILE: {
    doc: 'MCP server profile name for predefined server bundles',
    format: String,
    default: '',
    env: 'BOTS_{name}_MCP_SERVER_PROFILE',
  },

  MEMORY_PROFILE: {
    doc: 'Memory provider profile name for conversation memory',
    format: String,
    default: '',
    env: 'BOTS_{name}_MEMORY_PROFILE',
  },

  DISABLE_DELAYS: {
    doc: 'When true, skips all artificial delays. Bot responds as fast as LLM can generate.',
    format: Boolean,
    default: false,
    env: 'BOTS_{name}_DISABLE_DELAYS',
  },

  // Discord-specific configuration
  DISCORD_BOT_TOKEN: {
    doc: 'Discord bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_BOT_TOKEN',
  },

  DISCORD_CLIENT_ID: {
    doc: 'Discord client ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CLIENT_ID',
  },

  DISCORD_GUILD_ID: {
    doc: 'Discord guild ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_GUILD_ID',
  },

  DISCORD_CHANNEL_ID: {
    doc: 'Default Discord channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_CHANNEL_ID',
  },

  DISCORD_VOICE_CHANNEL_ID: {
    doc: 'Discord voice channel ID',
    format: String,
    default: '',
    env: 'BOTS_{name}_DISCORD_VOICE_CHANNEL_ID',
  },

  // Slack-specific configuration
  SLACK_BOT_TOKEN: {
    doc: 'Slack bot token',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_BOT_TOKEN',
  },

  SLACK_APP_TOKEN: {
    doc: 'Slack app token for Socket Mode',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_APP_TOKEN',
  },

  SLACK_SIGNING_SECRET: {
    doc: 'Slack signing secret for verifying requests',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_SIGNING_SECRET',
  },

  SLACK_JOIN_CHANNELS: {
    doc: 'Comma-separated Slack channel IDs to join',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_JOIN_CHANNELS',
  },

  SLACK_DEFAULT_CHANNEL_ID: {
    doc: 'Default Slack channel ID for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_SLACK_DEFAULT_CHANNEL_ID',
  },

  SLACK_MODE: {
    doc: 'Slack connection mode (socket or rtm)',
    format: ['socket', 'rtm'],
    default: 'socket',
    env: 'BOTS_{name}_SLACK_MODE',
  },

  // Mattermost-specific configuration
  MATTERMOST_SERVER_URL: {
    doc: 'Mattermost server endpoint',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_SERVER_URL',
  },

  MATTERMOST_TOKEN: {
    doc: 'Mattermost authentication token',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_TOKEN',
  },

  MATTERMOST_CHANNEL: {
    doc: 'Default Mattermost channel for messages',
    format: String,
    default: '',
    env: 'BOTS_{name}_MATTERMOST_CHANNEL',
  },

  // OpenAI configuration
  OPENAI_API_KEY: {
    doc: 'OpenAI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_API_KEY',
  },

  OPENAI_MODEL: {
    doc: 'OpenAI model name',
    format: String,
    default: 'gpt-4',
    env: 'BOTS_{name}_OPENAI_MODEL',
  },

  OPENAI_BASE_URL: {
    doc: 'OpenAI API base URL',
    format: String,
    default: 'https://api.openai.com/v1',
    env: 'BOTS_{name}_OPENAI_BASE_URL',
  },

  OPENAI_SYSTEM_PROMPT: {
    doc: 'OpenAI system prompt for this bot',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENAI_SYSTEM_PROMPT',
  },

  // Flowise configuration
  FLOWISE_API_KEY: {
    doc: 'Flowise API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_FLOWISE_API_KEY',
  },

  FLOWISE_API_BASE_URL: {
    doc: 'Flowise API base URL',
    format: String,
    default: 'http://localhost:3000/api/v1',
    env: 'BOTS_{name}_FLOWISE_API_BASE_URL',
  },

  // OpenWebUI configuration
  OPENWEBUI_API_KEY: {
    doc: 'OpenWebUI API key',
    format: String,
    default: '',
    env: 'BOTS_{name}_OPENWEBUI_API_KEY',
  },

  OPENWEBUI_API_URL: {
    doc: 'OpenWebUI API URL',
    format: String,
    default: 'http://localhost:3000/api/',
    env: 'BOTS_{name}_OPENWEBUI_API_URL',
  },

  // OpenSwarm configuration
  OPENSWARM_BASE_URL: {
    doc: 'OpenSwarm API base URL',
    format: String,
    default: 'http://localhost:8000/v1',
    env: 'BOTS_{name}_OPENSWARM_BASE_URL',
  },

  OPENSWARM_API_KEY: {
    doc: 'OpenSwarm API key',
    format: String,
    default: 'dummy-key',
    env: 'BOTS_{name}_OPENSWARM_API_KEY',
  },

  OPENSWARM_TEAM: {
    doc: 'OpenSwarm team name (used as model)',
    format: String,
    default: 'default-team',
    env: 'BOTS_{name}_OPENSWARM_TEAM',
  },

  // Letta configuration
  LETTA_AGENT_ID: {
    doc: 'Letta agent ID for this bot',
    format: String,
    default: '',
    env: 'BOTS_{name}_LETTA_AGENT_ID',
  },

  LETTA_SYSTEM_PROMPT: {
    doc: 'System prompt override for Letta agent',
    format: String,
    default: '',
    env: 'BOTS_{name}_LETTA_SYSTEM_PROMPT',
  },

  LETTA_SESSION_MODE: {
    doc: 'How Letta conversation sessions are scoped.',
    format: ['default', 'per-channel', 'per-user', 'fixed'],
    default: 'default',
    env: 'BOTS_{name}_LETTA_SESSION_MODE',
  },

  LETTA_CONVERSATION_ID: {
    doc: 'Fixed Letta conversation ID to use when LETTA_SESSION_MODE is "fixed"',
    format: String,
    default: '',
    env: 'BOTS_{name}_LETTA_CONVERSATION_ID',
  },
};

export class BotConfigValidator {
  public validateConfiguration(config: unknown): ConfigurationValidationResult {
    const errors: string[] = [];
    const configObj = config as Record<string, unknown>;

    if (!configObj.name) {
      errors.push('Bot name is required');
    }

    if (!configObj.discord && !configObj.slack && !configObj.mattermost) {
      errors.push('At least one platform configuration is required');
    }

    const discordConfig = configObj.discord as Record<string, unknown>;
    if (discordConfig && !discordConfig.botToken) {
      errors.push('Discord bot token is required');
    }

    const slackConfig = configObj.slack as Record<string, unknown>;
    if (slackConfig && !slackConfig.botToken) {
      errors.push('Slack bot token is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  public sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...config };
    const discordConfig = sanitized.discord as Record<string, unknown>;
    if (discordConfig?.botToken) {
      discordConfig.botToken = 'secret-***';
    }
    const slackConfig = sanitized.slack as Record<string, unknown>;
    if (slackConfig?.botToken) {
      slackConfig.botToken = 'secret-***';
    }
    return sanitized;
  }
}
