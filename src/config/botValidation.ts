/**
 * Bot configuration validation, merge, and sanitize utilities.
 * Extracted from BotConfigurationManager for modularity.
 */

import type { ConfigurationValidationResult } from '@src/types/config';

/**
 * Validate a bot configuration object.
 */
export function validateBotConfiguration(config: unknown): ConfigurationValidationResult {
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

/**
 * Merge two configuration objects (shallow).
 */
export function mergeConfigurations(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  return { ...base, ...override };
}

/**
 * Sanitize a configuration object by masking sensitive fields.
 */
export function sanitizeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
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
