import { getLlmDefaultStatus } from '../config/llmDefaultStatus';
import type { BotInstance, CreateBotRequest } from './botTypes';

/**
 * Type guard to validate BotInstance
 */
export function isValidBotInstance(obj: unknown): obj is BotInstance {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const bot = obj as Record<string, unknown>;

  return (
    typeof bot.id === 'string' &&
    typeof bot.name === 'string' &&
    typeof bot.messageProvider === 'string' &&
    typeof bot.llmProvider === 'string' &&
    typeof bot.isActive === 'boolean' &&
    typeof bot.createdAt === 'string' &&
    typeof bot.lastModified === 'string' &&
    typeof bot.config === 'object' &&
    bot.config !== null
  );
}

/**
 * Validate create bot request
 */
export function validateCreateBotRequest(request: CreateBotRequest): void {
  if (!request.name || request.name.trim().length === 0) {
    throw new Error('Bot name is required');
  }

  if (
    !request.messageProvider ||
    !['discord', 'slack', 'mattermost'].includes(request.messageProvider)
  ) {
    throw new Error('Valid message provider is required (discord, slack, or mattermost)');
  }

  if (!request.llmProvider || request.llmProvider.trim() === '') {
    const llmDefaults = getLlmDefaultStatus();
    if (!llmDefaults.configured) {
      throw new Error('LLM provider is required when no default LLM is configured');
    }
  } else if (!['openai', 'flowise', 'openwebui', 'openswarm'].includes(request.llmProvider)) {
    throw new Error('Valid LLM provider is required (openai, flowise, openwebui, or openswarm)');
  }

  validateBotConfig(request.config || {});
}

/**
 * Validate bot configuration
 */
export function validateBotConfig(config: Record<string, unknown>): void {
  if (!config) return;

  // Validate message provider specific config
  if (config.discord && typeof config.discord === 'object') {
    const discordConfig = config.discord as Record<string, unknown>;
    if (!discordConfig.token || typeof discordConfig.token !== 'string') {
      throw new Error('Discord bot token is required');
    }
  }

  if (config.slack && typeof config.slack === 'object') {
    const slackConfig = config.slack as Record<string, unknown>;
    if (!slackConfig.botToken || typeof slackConfig.botToken !== 'string') {
      throw new Error('Slack bot token is required');
    }
    if (!slackConfig.signingSecret || typeof slackConfig.signingSecret !== 'string') {
      throw new Error('Slack signing secret is required');
    }
  }

  if (config.mattermost && typeof config.mattermost === 'object') {
    const mattermostConfig = config.mattermost as Record<string, unknown>;
    if (!mattermostConfig.serverUrl || typeof mattermostConfig.serverUrl !== 'string') {
      throw new Error('Mattermost server URL is required');
    }
    if (!mattermostConfig.token || typeof mattermostConfig.token !== 'string') {
      throw new Error('Mattermost token is required');
    }
  }

  // Validate LLM provider specific config
  if (config.openai && typeof config.openai === 'object') {
    const openaiConfig = config.openai as Record<string, unknown>;
    if (!openaiConfig.apiKey || typeof openaiConfig.apiKey !== 'string') {
      throw new Error('OpenAI API key is required');
    }
  }

  if (config.flowise && typeof config.flowise === 'object') {
    const flowiseConfig = config.flowise as Record<string, unknown>;
    if (!flowiseConfig.apiKey || typeof flowiseConfig.apiKey !== 'string') {
      throw new Error('Flowise API key is required');
    }
  }

  if (config.openwebui && typeof config.openwebui === 'object') {
    const openwebuiConfig = config.openwebui as Record<string, unknown>;
    if (!openwebuiConfig.apiKey || typeof openwebuiConfig.apiKey !== 'string') {
      throw new Error('OpenWebUI API key is required');
    }
  }
}

/**
 * Sanitize configuration by removing sensitive data
 */
export function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...config };

  // Remove sensitive fields with proper type checking
  if (sanitized.discord && typeof sanitized.discord === 'object') {
    const discordConfig = { ...sanitized.discord } as Record<string, unknown>;
    if (discordConfig.token) {
      discordConfig.token = '***';
    }
    sanitized.discord = discordConfig;
  }

  if (sanitized.slack && typeof sanitized.slack === 'object') {
    const slackConfig = { ...sanitized.slack } as Record<string, unknown>;
    if (slackConfig.botToken) {
      slackConfig.botToken = '***';
    }
    if (slackConfig.signingSecret) {
      slackConfig.signingSecret = '***';
    }
    if (slackConfig.appToken) {
      slackConfig.appToken = '***';
    }
    sanitized.slack = slackConfig;
  }

  if (sanitized.mattermost && typeof sanitized.mattermost === 'object') {
    const mattermostConfig = { ...sanitized.mattermost } as Record<string, unknown>;
    if (mattermostConfig.token) {
      mattermostConfig.token = '***';
    }
    sanitized.mattermost = mattermostConfig;
  }

  if (sanitized.openai && typeof sanitized.openai === 'object') {
    const openaiConfig = { ...sanitized.openai } as Record<string, unknown>;
    if (openaiConfig.apiKey) {
      openaiConfig.apiKey = '***';
    }
    sanitized.openai = openaiConfig;
  }

  if (sanitized.flowise && typeof sanitized.flowise === 'object') {
    const flowiseConfig = { ...sanitized.flowise } as Record<string, unknown>;
    if (flowiseConfig.apiKey) {
      flowiseConfig.apiKey = '***';
    }
    sanitized.flowise = flowiseConfig;
  }

  if (sanitized.openwebui && typeof sanitized.openwebui === 'object') {
    const openwebuiConfig = { ...sanitized.openwebui } as Record<string, unknown>;
    if (openwebuiConfig.apiKey) {
      openwebuiConfig.apiKey = '***';
    }
    sanitized.openwebui = openwebuiConfig;
  }

  return sanitized;
}
