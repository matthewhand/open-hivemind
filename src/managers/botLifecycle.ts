import type { EventEmitter } from 'events';
import Debug from 'debug';
import type { SecureConfigManager } from '@config/SecureConfigManager';
import type { IMessengerService } from '../message/interfaces/IMessengerService';
import { getMessengerServiceByProvider } from '../message/ProviderRegistry';
import { ErrorUtils } from '../types/errors';
import type { BotInstance } from './botTypes';

const debug = Debug('app:BotManager:lifecycle');

/**
 * Manages in-memory runtime state for running bots.
 */
export class BotRunningState {
  private runningBots = new Set<string>();

  set(botId: string, isRunning: boolean): void {
    if (isRunning) {
      this.runningBots.add(botId);
    } else {
      this.runningBots.delete(botId);
    }
  }

  isRunning(botId: string): boolean {
    return this.runningBots.has(botId);
  }

  get count(): number {
    return this.runningBots.size;
  }
}

/**
 * Helper to get the messenger service instance based on provider name.
 */
export async function getMessengerService(provider: string): Promise<IMessengerService | null> {
  return getMessengerServiceByProvider(provider);
}

/**
 * Initialize bot provider (connect to messenger service).
 */
export async function initializeBotProvider(
  bot: BotInstance,
  secureConfigManager: SecureConfigManager
): Promise<void> {
  try {
    // Get secure configuration
    const secureConfig = await secureConfigManager.getConfig(`bot_${bot.id}`);
    const mergedConfig = { ...bot.config, ...(secureConfig?.data || {}) };

    const service = await getMessengerService(bot.messageProvider);

    if (service && 'addBot' in service && typeof service.addBot === 'function') {
      await service.addBot({
        ...mergedConfig,
        name: bot.name,
      });
      debug(`${bot.messageProvider} bot ${bot.name} initialized`);
    } else {
      if (['mattermost', 'telegram'].includes(bot.messageProvider)) {
        debug(`${bot.messageProvider} not fully implemented yet`);
        return;
      }
      throw new Error(
        `Provider ${bot.messageProvider} service unavailable or does not support addBot`
      );
    }
  } catch (error: any) {
    debug(`Error initializing bot provider for ${bot.name}:`, ErrorUtils.getMessage(error));
    throw error;
  }
}

/**
 * Shutdown bot provider (disconnect from messenger service).
 */
export async function shutdownBotProvider(bot: BotInstance): Promise<void> {
  try {
    const service = await getMessengerService(bot.messageProvider);
    // Check if the service supports a disconnect/removeBot method
    if (service && 'disconnectBot' in service && typeof service.disconnectBot === 'function') {
      await service.disconnectBot(bot.name);
    } else if (service && 'removeBot' in service && typeof service.removeBot === 'function') {
      await service.removeBot(bot.name);
    }
    debug(`Shutdown bot provider for ${bot.name}`);
  } catch (error: any) {
    debug(`Error shutting down bot provider for ${bot.name}:`, ErrorUtils.getMessage(error));
    throw error;
  }
}

/**
 * Start a specific bot by ID.
 */
export async function startBotById(
  botId: string,
  getBot: (id: string) => Promise<BotInstance | null>,
  runningState: BotRunningState,
  secureConfigManager: SecureConfigManager,
  emitter: EventEmitter
): Promise<void> {
  try {
    debug(`Starting bot: ${botId}`);
    const bot = await getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    if (runningState.isRunning(botId)) {
      debug(`Bot ${bot.name} is already running`);
      return;
    }

    await initializeBotProvider(bot, secureConfigManager);
    runningState.set(botId, true);
    debug(`Bot ${bot.name} started successfully`);
    emitter.emit('botStarted', { botId, name: bot.name });
  } catch (error: any) {
    debug(`Failed to start bot ${botId}:`, ErrorUtils.getMessage(error));
    emitter.emit('botError', { botId, error });
    throw error;
  }
}

/**
 * Stop a specific bot by ID.
 */
export async function stopBotById(
  botId: string,
  getBot: (id: string) => Promise<BotInstance | null>,
  runningState: BotRunningState,
  emitter: EventEmitter
): Promise<void> {
  try {
    debug(`Stopping bot: ${botId}`);
    const bot = await getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    if (!runningState.isRunning(botId)) {
      debug(`Bot ${bot.name} is not running`);
      return;
    }

    await shutdownBotProvider(bot);
    runningState.set(botId, false);
    debug(`Bot ${bot.name} stopped successfully`);
    emitter.emit('botStopped', { botId, name: bot.name });
  } catch (error: any) {
    debug(`Failed to stop bot ${botId}:`, ErrorUtils.getMessage(error));
    emitter.emit('botError', { botId, error });
    throw error;
  }
}

/**
 * Send a welcome message when a bot is started (if configured).
 */
export async function sendWelcomeMessage(bot: BotInstance): Promise<void> {
  const enableWelcome = process.env.ENABLE_WELCOME_MESSAGE === 'true';
  if (!enableWelcome) return;

  try {
    const service = await getMessengerService(bot.messageProvider);
    if (service) {
      const defaultChannel =
        (bot.config as Record<string, { defaultChannelId?: string }>)?.slack?.defaultChannelId ||
        (bot.config as Record<string, { defaultChannelId?: string }>)?.discord?.defaultChannelId ||
        service.getDefaultChannel?.();
      if (defaultChannel) {
        const welcomeText =
          process.env.WELCOME_MESSAGE_TEXT || '🤖 I am now online and ready to assist.';
        await service.sendMessageToChannel(defaultChannel, welcomeText);
        debug(`Sent welcome message for bot ${bot.name} to channel ${defaultChannel}`);
      }
    }
  } catch (welcomeErr: any) {
    debug(`Failed to send welcome message for ${bot.name}:`, welcomeErr?.message);
  }
}

/**
 * Stop all services and connections on a bot instance.
 */
export async function stopBotServicesAndConnections(bot: BotInstance): Promise<void> {
  // Stop any active connections or services associated with this bot
  const botWithServices = bot as BotInstance & {
    services?: { stop?: () => Promise<void> }[];
  };
  if (botWithServices.services && Array.isArray(botWithServices.services)) {
    for (const service of botWithServices.services) {
      if (service && typeof service.stop === 'function') {
        try {
          await service.stop();
          debug(`Stopped service for bot: ${bot.name} (${bot.id})`);
        } catch (serviceError: any) {
          debug(`Error stopping service for bot ${bot.name}:`, ErrorUtils.getMessage(serviceError));
        }
      }
    }
  }

  // Close any active connections
  const botWithConnections = bot as BotInstance & {
    connections?: { close?: () => Promise<void> }[];
  };
  if (botWithConnections.connections && Array.isArray(botWithConnections.connections)) {
    for (const connection of botWithConnections.connections) {
      if (connection && typeof connection.close === 'function') {
        try {
          await connection.close();
          debug(`Closed connection for bot: ${bot.name} (${bot.id})`);
        } catch (connectionError: any) {
          debug(
            `Error closing connection for bot ${bot.name}:`,
            ErrorUtils.getMessage(connectionError)
          );
        }
      }
    }
  }
}
