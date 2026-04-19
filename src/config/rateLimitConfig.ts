/**
 * Rate Limiting Configuration
 * Defines all rate limiting policies for the application
 * Integrates with guard profiles for per-bot rate limiting
 */

import { Logger } from '../common/logger';

console.log('Initializing src/config/rateLimitConfig.ts');

const logger = Logger.withContext('rateLimitConfig');

interface RateLimitConfig {
  default: {
    windowMs: number;
    max: number;
  };
  auth: {
    windowMs: number;
    max: number;
  };
  config: {
    windowMs: number;
    max: number;
  };
  admin: {
    windowMs: number;
    max: number;
  };
  api: {
    windowMs: number;
    max: number;
  };
  redis: {
    url: string;
    prefix: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    enableOfflineQueue: boolean;
  };
}

/**
 * Rate limit settings for a specific bot
 */
export interface BotRateLimitSettings {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '3600000', 10), // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  },
  config: {
    windowMs: parseInt(process.env.RATE_LIMIT_CONFIG_WINDOW_MS || '300000', 10), // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_CONFIG_MAX || '10', 10),
  },
  admin: {
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '20', 10),
  },
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'rate_limit:',
    retryDelayOnFailover: 200,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  },
};

/**
 * Get rate limit settings for a specific bot by looking up its guard profile
 * @param botName - The name of the bot
 * @returns Rate limit settings or undefined if not configured
 */
export function getBotRateLimitSettings(botName: string): BotRateLimitSettings | undefined {
  try {
    // Lazy import to avoid circular dependencies
    const { BotConfigurationManager } = require('./BotConfigurationManager');
    const { getGuardrailProfileByKey } = require('./guardrailProfiles');

    const manager = BotConfigurationManager.getInstance();
    const botConfig = manager.getBot(botName);

    if (!botConfig) {
      return undefined;
    }

    // First check if bot has direct rate limit configuration
    if (botConfig.rateLimit?.enabled) {
      return {
        enabled: true,
        maxRequests: botConfig.rateLimit.maxRequests || 100,
        windowMs: botConfig.rateLimit.windowMs || 60000,
      };
    }

    // Check if bot has a guard profile with rate limiting
    const guardProfileName = botConfig.mcpGuardProfile;
    if (!guardProfileName) {
      return undefined;
    }

    const guardProfile = getGuardrailProfileByKey(guardProfileName);
    if (!guardProfile?.guards?.rateLimit) {
      return undefined;
    }

    const rateLimit = guardProfile.guards.rateLimit;
    if (!rateLimit.enabled) {
      return undefined;
    }

    return {
      enabled: true,
      maxRequests: rateLimit.maxRequests || 100,
      windowMs: rateLimit.windowMs || 60000,
    };
  } catch (error) {
    // If there's an error loading bot config or guard profile, return undefined
    // This allows the system to fall back to default rate limiting
    logger.error('Failed to get rate limit settings for bot', { botName, error });
    return undefined;
  }
}

/**
 * Get all bot rate limit settings as a map
 * @returns Map of bot name to rate limit settings
 */
export function getAllBotRateLimitSettings(): Map<string, BotRateLimitSettings> {
  const settings = new Map<string, BotRateLimitSettings>();

  try {
    // Lazy import to avoid circular dependencies
    const { BotConfigurationManager } = require('./BotConfigurationManager');
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();

    for (const bot of bots) {
      const botSettings = getBotRateLimitSettings(bot.name);
      if (botSettings) {
        settings.set(bot.name, botSettings);
      }
    }
  } catch (error) {
    logger.error('Failed to load bot rate limit settings', { error });
  }

  return settings;
}

export default RATE_LIMIT_CONFIG;
