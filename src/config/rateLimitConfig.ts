/**
 * Rate Limiting Configuration
 * Defines all rate limiting policies for the application
 * Integrates with guard profiles for per-bot rate limiting
 */

import { Logger } from '@common/logger';

const logger = Logger.withContext('rateLimitConfig');

interface RateLimitConfig {
  // Default rate limit: 100 requests per 15 minutes
  default: {
    windowMs: number;
    max: number;
  };

  // Configuration endpoint rate limit: 10 requests per 5 minutes
  config: {
    windowMs: number;
    max: number;
  };

  // Authentication rate limit: 5 attempts per hour
  auth: {
    windowMs: number;
    max: number;
  };

  // Admin operations rate limit: 20 requests per 15 minutes
  admin: {
    windowMs: number;
    max: number;
  };

  // Redis connection configuration
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

const rateLimitConfig: RateLimitConfig = {
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  config: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
  },
  auth: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
  },
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
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

export default rateLimitConfig;