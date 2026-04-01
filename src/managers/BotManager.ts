import crypto from 'crypto';
import { EventEmitter } from 'events';
import path from 'path';
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { SecureConfigManager } from '@config/SecureConfigManager';
import { UserConfigStore } from '@config/UserConfigStore';
import { webUIStorage } from '../storage/webUIStorage';
import { ErrorUtils } from '../types/errors';
import { checkBotEnvOverrides } from '../utils/envUtils';
import { performSingleBotHealthCheck, type BotHealthResult } from './botHealthCheck';
import {
  BotRunningState,
  getMessengerService,
  sendWelcomeMessage,
  shutdownBotProvider,
  startBotById as startBotByIdHelper,
  stopBotById as stopBotByIdHelper,
  stopBotServicesAndConnections,
} from './botLifecycle';
import { loadCustomBots, saveCustomBots, storeSecureConfig } from './botPersistence';
import type { BotInstance, CreateBotRequest } from './botTypes';
import { sanitizeConfig, validateBotConfig, validateCreateBotRequest } from './botValidation';

// Re-export types so existing imports continue to work
export type { BotInstance, CreateBotRequest } from './botTypes';

const debug = Debug('app:BotManager');

@singleton()
@injectable()
export class BotManager extends EventEmitter {
  private static instance: BotManager;
  private botConfigManager: BotConfigurationManager;
  private secureConfigManager: SecureConfigManager;
  private customBots = new Map<string, BotInstance>();
  private botsFilePath: string;
  private runningState = new BotRunningState();

  constructor() {
    super();
    this.botConfigManager = BotConfigurationManager.getInstance();
    this.secureConfigManager = SecureConfigManager.getInstanceSync();
    this.botsFilePath = path.join(process.cwd(), 'config', 'user', 'custom-bots.json');
    // Note: loadCustomBots is now async but called from constructor
    // We'll handle initialization separately
    debug('BotManager initialized');
  }

  public static async getInstance(): Promise<BotManager> {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
      await BotManager.instance.loadCustomBots();
    }
    return BotManager.instance;
  }

  /**
   * Generate a stable ID for configured bots based on name
   */
  private getStableId(name: string): string {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 8);
  }

  /**
   * Load custom bots from file
   */
  private async loadCustomBots(): Promise<void> {
    await loadCustomBots(this.botsFilePath, this.customBots);
  }

  /**
   * Save custom bots to file
   */
  private async saveCustomBots(): Promise<void> {
    await saveCustomBots(this.botsFilePath, this.customBots);
  }

  /**
   * Get all bot instances (both configured and custom)
   */
  public async getAllBots(): Promise<BotInstance[]> {
    try {
      const configuredBots = this.botConfigManager.getAllBots();
      const botMap = new Map<string, BotInstance>();

      // Add configured bots first
      for (const bot of configuredBots) {
        const botInstance = this.mapConfigToBotInstance(bot);
        botMap.set(botInstance.id, botInstance);
      }

      // Add custom bots from web UI storage (overwriting configured bots with same ID)
      const customBots = await webUIStorage.getAgents();
      for (const bot of customBots) {
        botMap.set(bot.id, bot as BotInstance);
      }

      const botInstances = Array.from(botMap.values());
      debug(`Retrieved ${botInstances.length} bot instances`);
      return botInstances;
    } catch (error: unknown) {
      debug('Error getting all bots:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError('Failed to retrieve bot instances', 'configuration');
    }
  }

  /**
   * Helper to map a raw configuration object to a BotInstance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapConfigToBotInstance(bot: Record<string, any>): BotInstance {
    return {
      // Use bot name as stable ID - random UUIDs break getBot() lookups
      id: bot.name,
      name: bot.name,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      isActive: true, // Configured bots are considered active
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      config: sanitizeConfig(bot),
      persona: bot.persona || 'default',
      systemInstruction: bot.systemInstruction,
      mcpServers: bot.mcpServers || [],
      mcpGuard: bot.mcpGuard || { enabled: false, type: 'owner' },
      envOverrides: checkBotEnvOverrides(bot.name),
    };
  }

  /**
   * Get a specific bot by ID
   */
  public async getBot(botId: string): Promise<BotInstance | null> {
    try {
      // Check custom bots first
      if (this.customBots.has(botId)) {
        const bot = this.customBots.get(botId)!;
        debug(`Retrieved custom bot: ${bot.name} (${bot.id})`);
        return bot;
      }

      // Check configured bots - O(1) lookup instead of O(N) iteration
      const configuredBot = this.botConfigManager.getBot(botId);

      if (configuredBot) {
        debug(`Retrieved configured bot: ${configuredBot.name} (${botId})`);
        return this.mapConfigToBotInstance(configuredBot);
      }

      debug(`Bot not found: ${botId}`);
      return null;
    } catch (error: unknown) {
      debug('Error getting bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError('Failed to retrieve bot instance', 'configuration');
    }
  }

  /**
   * Create a new bot instance
   */
  public async createBot(request: CreateBotRequest): Promise<BotInstance> {
    try {
      // Validate the request
      validateCreateBotRequest(request);

      // Generate unique ID
      const botId = crypto.randomUUID();

      // Create bot instance
      const botInstance: BotInstance = {
        id: botId,
        name: request.name,
        messageProvider: request.messageProvider,
        llmProvider: request.llmProvider?.trim() || '',
        isActive: false, // New bots start inactive
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        config: sanitizeConfig(request.config || {}),
        persona: request.persona,
        systemInstruction: request.systemInstruction,
        mcpServers: request.mcpServers,
        mcpGuard: request.mcpGuard,
      };

      // Store sensitive configuration securely
      await storeSecureConfig(this.secureConfigManager, botId, request.config || {});

      // Add to web UI storage
      await webUIStorage.saveAgent(botInstance);

      debug(`Created new bot: ${request.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botCreated', botInstance);

      return botInstance;
    } catch (error: unknown) {
      debug('Error creating bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to create bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Clone an existing bot instance
   */
  public async cloneBot(botId: string, newName: string): Promise<BotInstance> {
    try {
      const sourceBot = await this.getBot(botId);
      if (!sourceBot) {
        throw new Error('Source bot not found');
      }

      // Check if it's a custom bot
      const customBots = await webUIStorage.getAgents();
      const isCustom = customBots.some((b: Record<string, unknown>) => b.id === botId);

      if (isCustom) {
        // Clone as custom bot (existing logic)
        const cloneRequest: CreateBotRequest = {
          name: newName,
          messageProvider: sourceBot.messageProvider as 'discord' | 'slack' | 'mattermost',
          llmProvider: (sourceBot.llmProvider || undefined) as
            | 'openai'
            | 'flowise'
            | 'openwebui'
            | 'openswarm'
            | undefined,
          config: sourceBot.config as CreateBotRequest['config'],
          persona: sourceBot.persona,
          systemInstruction: sourceBot.systemInstruction,
          mcpServers: sourceBot.mcpServers,
          mcpGuard: sourceBot.mcpGuard,
        };

        const clonedBot = await this.createBot(cloneRequest);
        debug(`Cloned custom bot ${sourceBot.name} (${botId}) to ${newName} (${clonedBot.id})`);
        this.emit('botCloned', { sourceBot, clonedBot });
        return clonedBot;
      } else {
        // Clone as configured bot (file-based)
        await this.botConfigManager.cloneBot(botId, newName);

        // Retrieve the new configured bot instance
        const clonedBot = await this.getBot(newName);
        if (!clonedBot) {
          throw new Error(`Failed to retrieve cloned configured bot "${newName}"`);
        }

        debug(`Cloned configured bot ${sourceBot.name} (${botId}) to ${newName}`);
        this.emit('botCloned', { sourceBot, clonedBot });
        return clonedBot;
      }
    } catch (error: unknown) {
      debug('Error cloning bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to clone bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Update an existing bot instance
   */
  public async updateBot(botId: string, updates: Partial<CreateBotRequest>): Promise<BotInstance> {
    try {
      const existingBot = await this.getBot(botId);
      if (!existingBot) {
        throw new Error('Bot not found');
      }

      // Validate updates
      if (updates.config) {
        validateBotConfig(updates.config);
      }

      // Update bot instance
      const updatedBot: BotInstance = {
        ...existingBot,
        ...updates,
        lastModified: new Date().toISOString(),
        config: updates.config
          ? sanitizeConfig({ ...existingBot.config, ...updates.config })
          : existingBot.config,
        persona: updates.persona !== undefined ? updates.persona : existingBot.persona,
        systemInstruction:
          updates.systemInstruction !== undefined
            ? updates.systemInstruction
            : existingBot.systemInstruction,
        mcpServers: updates.mcpServers !== undefined ? updates.mcpServers : existingBot.mcpServers,
        mcpGuard: updates.mcpGuard !== undefined ? updates.mcpGuard : existingBot.mcpGuard,
      };

      // Store updated secure config if provided
      if (updates.config) {
        await storeSecureConfig(this.secureConfigManager, botId, updates.config);
      }

      // Update in web UI storage
      await webUIStorage.saveAgent(updatedBot);

      debug(`Updated bot: ${updatedBot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botUpdated', updatedBot);

      return updatedBot;
    } catch (error: unknown) {
      debug('Error updating bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to update bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Delete a bot instance
   */
  public async deleteBot(botId: string): Promise<void> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      // Check if it's a custom bot
      const customBots = await webUIStorage.getAgents();
      const isCustom = customBots.some((b: Record<string, unknown>) => b.id === botId);

      if (isCustom) {
        // Remove from web UI storage
        await webUIStorage.deleteAgent(botId);
        // Remove secure configuration
        await this.secureConfigManager.deleteConfig(`bot_${botId}`);
      } else {
        // Assume it's a configured bot
        try {
          await this.botConfigManager.deleteBot(botId);
          // Also try to remove secure config if it exists
          await this.secureConfigManager.deleteConfig(`bot_${botId}`);
        } catch (err: unknown) {
          debug(`Failed to delete configured bot ${botId}: ${ErrorUtils.getMessage(err)}`);
          throw err;
        }
      }

      debug(`Deleted bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botDeleted', bot);
    } catch (error: unknown) {
      debug('Error deleting bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to delete bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Start a bot instance
   */
  public async startBot(botId: string): Promise<boolean> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      // Persist enabled state to user config file
      const userConfigStore = UserConfigStore.getInstance();
      await userConfigStore.setBotDisabled(bot.name, false);
      debug(`Persisted enabled state for bot: ${bot.name}`);

      // Update bot status in memory
      const updatedBot = { ...bot, isActive: true, lastModified: new Date().toISOString() };
      const isCustomBot = this.customBots.has(botId);
      if (isCustomBot) {
        this.customBots.set(botId, updatedBot);
        await this.saveCustomBots();
      }

      await this.startBotById(botId);

      // Send Welcome Message when bot is enabled (if configured)
      await sendWelcomeMessage(bot);

      debug(`Started bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botStarted', updatedBot);

      return true;
    } catch (error: unknown) {
      debug('Error starting bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to start bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Stop a bot instance
   */
  public async stopBot(botId: string): Promise<boolean> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      // Persist disabled state to user config file
      const userConfigStore = UserConfigStore.getInstance();
      await userConfigStore.setBotDisabled(bot.name, true);
      debug(`Persisted disabled state for bot: ${bot.name}`);

      // Update bot status in memory
      const updatedBot = { ...bot, isActive: false, lastModified: new Date().toISOString() };
      const isCustomBot = this.customBots.has(botId);
      if (isCustomBot) {
        this.customBots.set(botId, updatedBot);
        await this.saveCustomBots();
      }

      // Use integration-agnostic shutdown
      try {
        await shutdownBotProvider(bot);
      } catch (shutdownError: unknown) {
        debug(`Failed to disconnect bot ${bot.name}: ${ErrorUtils.getMessage(shutdownError)}`);
      }

      // Stop services and connections
      await stopBotServicesAndConnections(bot);

      debug(`Stopped bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botStopped', updatedBot);

      return true;
    } catch (error: unknown) {
      debug('Error stopping bot:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError(
        `Failed to stop bot: ${ErrorUtils.getMessage(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Start all configured bots
   */
  public async startAllConfiguredBots(): Promise<void> {
    try {
      debug('Starting all configured bots...');

      const allBots = await Promise.resolve(this.getAllBots());
      const startPromises = allBots.map(async (bot: BotInstance) => {
        try {
          if (bot.isActive) {
            await this.startBotById(bot.id);
            debug(`Started bot: ${bot.name}`);
          } else {
            debug(`Skipping inactive bot: ${bot.name}`);
          }
        } catch (error: unknown) {
          debug(`Failed to start bot ${bot.name}:`, ErrorUtils.getMessage(error));
          this.emit('botError', { botId: bot.id, error });
        }
      });

      await Promise.allSettled(startPromises);

      const runningBots = this.runningState.count;
      debug(`Bot startup completed: ${runningBots}/${allBots.length} bots running`);

      this.emit('allBotsStarted', { total: allBots.length, running: runningBots });
    } catch (error: unknown) {
      debug('Error starting all bots:', ErrorUtils.getMessage(error));
      throw error;
    }
  }

  /**
   * Stop all running bots
   */
  public async stopAllConfiguredBots(): Promise<void> {
    try {
      debug('Stopping all bots...');

      const allBots = await this.getAllBots();
      const stopPromises = allBots.map(async (bot: BotInstance) => {
        try {
          await this.stopBotById(bot.id);
          debug(`Stopped bot: ${bot.name}`);
        } catch (error: unknown) {
          debug(`Failed to stop bot ${bot.name}:`, ErrorUtils.getMessage(error));
          this.emit('botError', { botId: bot.id, error });
        }
      });

      await Promise.allSettled(stopPromises);

      debug('All bots stopped');
      this.emit('allBotsStopped');
    } catch (error: unknown) {
      debug('Error stopping all bots:', ErrorUtils.getMessage(error));
      throw error;
    }
  }

  /**
   * Get chat history for a bot
   */
  public async getBotHistory(botId: string, channelId?: string, limit = 20): Promise<unknown[]> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const targetChannel =
        channelId ||
        (bot.config as Record<string, { defaultChannelId?: string }>)?.slack?.defaultChannelId ||
        (bot.config as Record<string, { defaultChannelId?: string }>)?.discord?.defaultChannelId;
      if (!targetChannel) {
        debug(`No channel specified for bot ${bot.name} history`);
        return [];
      }

      const service = await getMessengerService(bot.messageProvider);
      if (service) {
        return await service.getMessagesFromChannel(targetChannel, limit);
      }

      return [];
    } catch (error: unknown) {
      debug(`Failed to get bot history for ${botId}:`, ErrorUtils.getMessage(error));
      return [];
    }
  }

  /**
   * Start a specific bot by ID
   */
  public async startBotById(botId: string): Promise<void> {
    await startBotByIdHelper(
      botId,
      (id) => this.getBot(id),
      this.runningState,
      this.secureConfigManager,
      this
    );
  }

  /**
   * Stop a specific bot by ID
   */
  public async stopBotById(botId: string): Promise<void> {
    await stopBotByIdHelper(botId, (id) => this.getBot(id), this.runningState, this);
  }

  /**
   * Restart a specific bot
   */
  public async restartBot(botId: string): Promise<void> {
    try {
      debug(`Restarting bot: ${botId}`);
      await this.stopBotById(botId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.startBotById(botId);
      debug(`Bot ${botId} restarted successfully`);
      this.emit('botRestarted', { botId });
    } catch (error: unknown) {
      debug(`Failed to restart bot ${botId}:`, ErrorUtils.getMessage(error));
      throw error;
    }
  }

  /**
   * Get status of all bots
   */
  public async getBotsStatus(): Promise<
    {
      id: string;
      name: string;
      provider: string;
      isRunning: boolean;
      isActive: boolean;
    }[]
  > {
    const allBots = await this.getAllBots();
    return allBots.map((bot: BotInstance) => ({
      id: bot.id,
      name: bot.name,
      provider: bot.messageProvider,
      isRunning: this.runningState.isRunning(bot.id),
      isActive: bot.isActive,
    }));
  }

  /**
   * Get system metrics
   */
  public async getSystemMetrics(): Promise<{
    totalBots: number;
    runningBots: number;
    activeBots: number;
    systemUptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const allBots = await this.getAllBots();
    const activeBots = allBots.filter((bot: BotInstance) => bot.isActive);

    return {
      totalBots: allBots.length,
      runningBots: this.runningState.count,
      activeBots: activeBots.length,
      systemUptime: process.uptime() * 1000, // milliseconds
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Health check for all bots
   */
  public async performHealthCheck(): Promise<BotHealthResult[]> {
    const allBots = await this.getAllBots();
    const healthChecks = allBots.map(async (bot: BotInstance) => {
      return performSingleBotHealthCheck(
        bot,
        this.runningState.isRunning(bot.id),
        this.secureConfigManager
      );
    });

    const results = await Promise.allSettled(healthChecks);
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        botId: 'unknown',
        name: 'unknown',
        status: 'unhealthy' as const,
        lastCheck: new Date(),
        issues: ['Health check failed to execute'],
      };
    });
  }
}
