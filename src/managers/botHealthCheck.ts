import Debug from 'debug';
import { type SecureConfigManager } from '@config/SecureConfigManager';
import { ErrorUtils } from '../types/errors';
import type { BotInstance } from './botTypes';

const debug = Debug('app:BotManager:healthCheck');

export interface BotHealthResult {
  botId: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'stopped';
  lastCheck: Date;
  issues?: string[];
}

/**
 * Check health of a specific bot
 */
export async function checkBotHealth(
  bot: BotInstance,
  secureConfigManager: SecureConfigManager
): Promise<boolean> {
  try {
    // Basic health check - can be extended per provider
    const secureConfig = await secureConfigManager.getConfig(`bot_${bot.id}`);

    if (!secureConfig) {
      debug(`No secure config found for bot ${bot.name}`);
      return false;
    }

    // Add provider-specific health checks here
    switch (bot.messageProvider.toLowerCase()) {
      case 'discord':
        return checkDiscordBotHealth(bot, secureConfig.data);
      case 'slack':
        return checkSlackBotHealth(bot, secureConfig.data);
      case 'mattermost':
        return checkMattermostBotHealth(bot, secureConfig.data);
      case 'telegram':
        return checkTelegramBotHealth(bot, secureConfig.data);
      default:
        return true; // Unknown provider, assume healthy
    }
  } catch (error: unknown) {
    debug(`Health check failed for bot ${bot.name}:`, ErrorUtils.getMessage(error));
    return false;
  }
}

async function checkDiscordBotHealth(
  bot: BotInstance,
  config: Record<string, unknown>
): Promise<boolean> {
  // Discord-specific health check
  const discordConfig = config?.discord as Record<string, unknown>;
  return !!(discordConfig?.token && typeof discordConfig.token === 'string');
}

async function checkSlackBotHealth(
  bot: BotInstance,
  config: Record<string, unknown>
): Promise<boolean> {
  // Slack-specific health check
  const slackConfig = config?.slack as Record<string, unknown>;
  return !!(slackConfig?.botToken && typeof slackConfig.botToken === 'string');
}

async function checkMattermostBotHealth(
  bot: BotInstance,
  config: Record<string, unknown>
): Promise<boolean> {
  // Mattermost-specific health check
  const mattermostConfig = config?.mattermost as Record<string, unknown>;
  const hasToken = !!(mattermostConfig?.token && typeof mattermostConfig.token === 'string');
  const hasServerUrl = !!(
    mattermostConfig?.serverUrl && typeof mattermostConfig.serverUrl === 'string'
  );
  return hasToken && hasServerUrl;
}

async function checkTelegramBotHealth(
  bot: BotInstance,
  config: Record<string, unknown>
): Promise<boolean> {
  // Telegram-specific health check
  const telegramConfig = config?.telegram as Record<string, unknown>;
  return !!(telegramConfig?.token && typeof telegramConfig.token === 'string');
}

/**
 * Perform health check for a single bot given its running state.
 */
export async function performSingleBotHealthCheck(
  bot: BotInstance,
  isRunning: boolean,
  secureConfigManager: SecureConfigManager
): Promise<BotHealthResult> {
  const issues: string[] = [];
  let status: 'healthy' | 'unhealthy' | 'stopped' = 'stopped';

  try {
    if (isRunning) {
      const isHealthy = await checkBotHealth(bot, secureConfigManager);
      status = isHealthy ? 'healthy' : 'unhealthy';

      if (!isHealthy) {
        issues.push('Bot health check failed');
      }
    }
  } catch (error: unknown) {
    status = 'unhealthy';
    issues.push(`Health check error: ${ErrorUtils.getMessage(error)}`);
  }

  return {
    botId: bot.id,
    name: bot.name,
    status,
    lastCheck: new Date(),
    issues: issues.length > 0 ? issues : undefined,
  };
}
