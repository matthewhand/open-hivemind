import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { BotConfig } from '@src/types/config';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { SecureConfigManager } from '@config/SecureConfigManager';
import { UserConfigStore } from '@config/UserConfigStore';
import { getLlmDefaultStatus } from '../config/llmDefaultStatus';
import type { MCPGuardConfig } from '../mcp/MCPGuard';
import type { MCPConfig } from '../mcp/MCPService';
import { getMessengerServiceByProvider } from '../message/ProviderRegistry';
import { webUIStorage } from '../storage/webUIStorage';
import { AppError, ErrorUtils, HivemindError } from '../types/errors';
import { checkBotEnvOverrides } from '../utils/envUtils';

const debug = Debug('app:BotManager');

export interface BotInstance {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
  config: Record<string, unknown>;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: MCPConfig[];
  mcpGuard?: MCPGuardConfig;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost';
  llmProvider?: 'openai' | 'flowise' | 'openwebui' | 'openswarm';
  config?: {
    discord?: {
      token: string;
      voiceChannelId?: string;
    };
    slack?: {
      botToken: string;
      signingSecret: string;
      appToken?: string;
    };
    mattermost?: {
      serverUrl: string;
      token: string;
    };
    openai?: {
      apiKey: string;
      model?: string;
    };
    flowise?: {
      apiKey: string;
      endpoint?: string;
    };
    openwebui?: {
      apiKey: string;
      endpoint?: string;
    };
  };
  persona?: string;
  systemInstruction?: string;
  mcpServers?: MCPConfig[];
  mcpGuard?: MCPGuardConfig;
}

export class BotManager extends EventEmitter {
  private static instance: BotManager;
  private botConfigManager: BotConfigurationManager;
  private secureConfigManager: SecureConfigManager;
  private customBots = new Map<string, BotInstance>();
  private botsFilePath: string;

  constructor() {
    super();
    this.botConfigManager = BotConfigurationManager.getInstance();
    this.secureConfigManager = SecureConfigManager.getInstance();
    this.botsFilePath = path.join(process.cwd(), 'config', 'user', 'custom-bots.json');
    this.loadCustomBots();
    debug('BotManager initialized');
  }

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
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

  /**
   * Load custom bots from file
   */
  private loadCustomBots(): void {
    try {
      if (fs.existsSync(this.botsFilePath)) {
        const data = fs.readFileSync(this.botsFilePath, 'utf8');
        const bots = JSON.parse(data);
        this.customBots.clear();
        Object.entries(bots).forEach(([id, bot]: [string, unknown]) => {
          // Type guard to ensure the unknown value matches BotInstance interface
          if (this.isValidBotInstance(bot)) {
            this.customBots.set(id, bot);
          } else {
            debug(`Invalid bot instance found for ID ${id}, skipping`);
          }
        });
        debug(`Loaded ${this.customBots.size} custom bots`);
      }
    } catch (error: unknown) {
      debug('Error loading custom bots:', ErrorUtils.getMessage(error));
    }
  }

  /**
   * Save custom bots to file
   */
  private saveCustomBots(): void {
    try {
      const botsDir = path.dirname(this.botsFilePath);
      if (!fs.existsSync(botsDir)) {
        fs.mkdirSync(botsDir, { recursive: true });
      }

      const bots = Object.fromEntries(this.customBots);
      fs.writeFileSync(this.botsFilePath, JSON.stringify(bots, null, 2));
      debug(`Saved ${this.customBots.size} custom bots`);
    } catch (error: unknown) {
      debug('Error saving custom bots:', ErrorUtils.getMessage(error));
      throw ErrorUtils.createError('Failed to save custom bots', 'configuration');
    }
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
        const botInstance: BotInstance = {
          // Use bot name as stable ID - random UUIDs break getBot() lookups
          id: bot.name,
          name: bot.name,
          messageProvider: bot.messageProvider,
          llmProvider: bot.llmProvider,
          isActive: true, // Configured bots are considered active
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          config: this.sanitizeConfig(bot),
          persona: bot.persona || 'default',
          systemInstruction: bot.systemInstruction,
          mcpServers: bot.mcpServers || [],
          mcpGuard: bot.mcpGuard || { enabled: false, type: 'owner' },
          envOverrides: checkBotEnvOverrides(bot.name),
        };
        botMap.set(botInstance.id, botInstance);
      }

      // Add custom bots from web UI storage (overwriting configured bots with same ID)
      const customBots = webUIStorage.getAgents();
      for (const bot of customBots) {
        botMap.set(bot.id, bot);
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

      // Check configured bots
      const bots = await this.getAllBots();
      const bot = bots.find((b) => b.id === botId);

      if (bot) {
        debug(`Retrieved configured bot: ${bot.name} (${bot.id})`);
      } else {
        debug(`Bot not found: ${botId}`);
      }

      return bot || null;
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
      this.validateCreateBotRequest(request);

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
        config: this.sanitizeConfig(request.config || {}),
        persona: request.persona,
        systemInstruction: request.systemInstruction,
        mcpServers: request.mcpServers,
        mcpGuard: request.mcpGuard,
      };

      // Store sensitive configuration securely
      await this.storeSecureConfig(botId, request.config || {});

      // Add to web UI storage
      webUIStorage.saveAgent(botInstance);

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
   * Type guard to validate BotInstance
   */
  private isValidBotInstance(obj: unknown): obj is BotInstance {
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
   * Clone an existing bot instance
   */
  public async cloneBot(botId: string, newName: string): Promise<BotInstance> {
    try {
      const sourceBot = await this.getBot(botId);
      if (!sourceBot) {
        throw new Error('Source bot not found');
      }

      // Check if it's a custom bot
      const customBots = webUIStorage.getAgents();
      const isCustom = customBots.some((b) => b.id === botId);

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
        this.validateBotConfig(updates.config);
      }

      // Update bot instance
      const updatedBot: BotInstance = {
        ...existingBot,
        ...updates,
        lastModified: new Date().toISOString(),
        config: updates.config
          ? this.sanitizeConfig({ ...existingBot.config, ...updates.config })
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
        await this.storeSecureConfig(botId, updates.config);
      }

      // Update in web UI storage
      webUIStorage.saveAgent(updatedBot);

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
  public async deleteBot(botId: string): Promise<boolean> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        return false;
      }

      // Check if it's a custom bot
      const customBots = webUIStorage.getAgents();
      const isCustom = customBots.some((b) => b.id === botId);

      if (isCustom) {
        // Remove from web UI storage
        webUIStorage.deleteAgent(botId);
        // Remove secure configuration
        await this.secureConfigManager.deleteConfig(`bot_${botId}`);
      } else {
        // Assume it's a configured bot
        try {
          await this.botConfigManager.deleteBot(botId);
          // Also try to remove secure config if it exists
          await this.secureConfigManager.deleteConfig(`bot_${botId}`);
        } catch (err: any) {
          debug(`Failed to delete configured bot ${botId}: ${err.message}`);
          throw err;
        }
      }

      debug(`Deleted bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botDeleted', bot);

      return true;
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
      this.customBots.set(botId, updatedBot);
      this.saveCustomBots();

      await this.startBotById(botId);

      // Send Welcome Message when bot is enabled (if configured)
      const enableWelcome = process.env.ENABLE_WELCOME_MESSAGE === 'true';
      if (enableWelcome) {
        try {
          const service = await this.getMessengerService(bot.messageProvider);
          if (service) {
            const defaultChannel =
              (bot.config as any)?.slack?.defaultChannelId ||
              (bot.config as any)?.discord?.defaultChannelId ||
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
      this.customBots.set(botId, updatedBot);
      this.saveCustomBots();

      // Use integration-agnostic shutdown
      try {
        await this.shutdownBotProvider(bot);
      } catch (shutdownError: any) {
        debug(`Failed to disconnect bot ${bot.name}: ${shutdownError?.message || shutdownError}`);
      }

      // Stop any active connections or services associated with this bot
      const botWithServices = bot as BotInstance & {
        services?: { stop?: () => Promise<void> }[];
      };
      if (botWithServices.services && Array.isArray(botWithServices.services)) {
        for (const service of botWithServices.services) {
          if (service && typeof service.stop === 'function') {
            try {
              await service.stop();
              debug(`Stopped service for bot: ${bot.name} (${botId})`);
            } catch (serviceError: HivemindError) {
              debug(
                `Error stopping service for bot ${bot.name}:`,
                ErrorUtils.getMessage(serviceError)
              );
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
              debug(`Closed connection for bot: ${bot.name} (${botId})`);
            } catch (connectionError: HivemindError) {
              debug(
                `Error closing connection for bot ${bot.name}:`,
                ErrorUtils.getMessage(connectionError)
              );
            }
          }
        }
      }

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
   * Validate create bot request
   */
  private validateCreateBotRequest(request: CreateBotRequest): void {
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

    this.validateBotConfig(request.config || {});
  }

  /**
   * Validate bot configuration
   */
  private validateBotConfig(config: Record<string, unknown>): void {
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
   * Store sensitive configuration securely
   */
  private async storeSecureConfig(botId: string, config: Record<string, unknown>): Promise<void> {
    const secureConfigId = `bot_${botId}`;
    const secureData = {
      ...config,
      storedAt: new Date().toISOString(),
    };

    await this.secureConfigManager.storeConfig({
      id: secureConfigId,
      name: `Bot ${botId} Configuration`,
      type: 'bot',
      data: secureData,
      createdAt: new Date().toISOString(),
    } as Parameters<typeof this.secureConfigManager.storeConfig>[0]);
  }

  /**
   * Sanitize configuration by removing sensitive data
   */
  private sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
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

      const runningBots = this.getRunningBotsCount();
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
  /**
   * Get chat history for a bot
   */
  public async getBotHistory(botId: string, channelId?: string, limit = 20): Promise<any[]> {
    try {
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error('Bot not found');
      }

      const targetChannel =
        channelId ||
        (bot.config as any)?.slack?.defaultChannelId ||
        (bot.config as any)?.discord?.defaultChannelId;
      if (!targetChannel) {
        debug(`No channel specified for bot ${bot.name} history`);
        return [];
      }

      const service = await this.getMessengerService(bot.messageProvider);
      if (service) {
        return await service.getMessagesFromChannel(targetChannel, limit);
      }

      return [];
    } catch (error: any) {
      debug(`Failed to get bot history for ${botId}:`, error.message);
      return [];
    }
  }

  /**
   * Helper to get the messenger service instance based on provider name.
   * Uses ProviderRegistry for integration-agnostic dynamic loading.
   */
  private async getMessengerService(
    provider: string
  ): Promise<import('../message/interfaces/IMessengerService').IMessengerService | null> {
    return getMessengerServiceByProvider(provider);
  }

  /**
   * Start a specific bot by ID
   */
  public async startBotById(botId: string): Promise<void> {
    try {
      debug(`Starting bot: ${botId}`);
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }

      if (this.isBotRunning(botId)) {
        debug(`Bot ${bot.name} is already running`);
        return;
      }

      await this.initializeBotProvider(bot);
      this.setBotRunningState(botId, true);
      debug(`Bot ${bot.name} started successfully`);
      this.emit('botStarted', { botId, name: bot.name });
    } catch (error: any) {
      debug(`Failed to start bot ${botId}:`, ErrorUtils.getMessage(error));
      this.emit('botError', { botId, error });
      throw error;
    }
  }

  /**
   * Stop a specific bot by ID
   */
  public async stopBotById(botId: string): Promise<void> {
    try {
      debug(`Stopping bot: ${botId}`);
      const bot = await this.getBot(botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }

      if (!this.isBotRunning(botId)) {
        debug(`Bot ${bot.name} is not running`);
        return;
      }

      await this.shutdownBotProvider(bot);
      this.setBotRunningState(botId, false);
      debug(`Bot ${bot.name} stopped successfully`);
      this.emit('botStopped', { botId, name: bot.name });
    } catch (error: any) {
      debug(`Failed to stop bot ${botId}:`, ErrorUtils.getMessage(error));
      this.emit('botError', { botId, error });
      throw error;
    }
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
    } catch (error: any) {
      debug(`Failed to restart bot ${botId}:`, ErrorUtils.getMessage(error));
      throw error;
    }
  }

  /**
   * Initialize bot provider
   */
  private async initializeBotProvider(bot: BotInstance): Promise<void> {
    try {
      // Get secure configuration
      const secureConfig = await this.secureConfigManager.getConfig(`bot_${bot.id}`);
      const mergedConfig = { ...bot.config, ...(secureConfig?.data || {}) };

      const service = await this.getMessengerService(bot.messageProvider);

      if (service && typeof (service as any).addBot === 'function') {
        await (service as any).addBot({
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
   * Shutdown bot provider
   * Uses ProviderRegistry for integration-agnostic loading.
   */
  private async shutdownBotProvider(bot: BotInstance): Promise<void> {
    try {
      const service = await this.getMessengerService(bot.messageProvider);
      // Check if the service supports a disconnect/removeBot method
      if (service && typeof (service as any).disconnectBot === 'function') {
        await (service as any).disconnectBot(bot.name);
      } else if (service && typeof (service as any).removeBot === 'function') {
        await (service as any).removeBot(bot.name);
      }
      debug(`Shutdown bot provider for ${bot.name}`);
    } catch (error: any) {
      debug(`Error shutting down bot provider for ${bot.name}:`, ErrorUtils.getMessage(error));
      throw error;
    }
  }

  // Runtime state management (in-memory tracking)
  private runningBots = new Set<string>();

  private setBotRunningState(botId: string, isRunning: boolean): void {
    if (isRunning) {
      this.runningBots.add(botId);
    } else {
      this.runningBots.delete(botId);
    }
  }

  private isBotRunning(botId: string): boolean {
    return this.runningBots.has(botId);
  }

  private getRunningBotsCount(): number {
    return this.runningBots.size;
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
      isRunning: this.isBotRunning(bot.id),
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
      runningBots: this.getRunningBotsCount(),
      activeBots: activeBots.length,
      systemUptime: process.uptime() * 1000, // milliseconds
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Health check for all bots
   */
  public async performHealthCheck(): Promise<
    {
      botId: string;
      name: string;
      status: 'healthy' | 'unhealthy' | 'stopped';
      lastCheck: Date;
      issues?: string[];
    }[]
  > {
    const allBots = await this.getAllBots();
    const healthChecks = allBots.map(async (bot: BotInstance) => {
      const issues: string[] = [];
      let status: 'healthy' | 'unhealthy' | 'stopped' = 'stopped';

      try {
        if (this.isBotRunning(bot.id)) {
          // Perform health checks specific to the bot type
          const isHealthy = await this.checkBotHealth(bot);
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
    });

    return Promise.all(healthChecks);
  }

  /**
   * Check health of a specific bot
   */
  private async checkBotHealth(bot: BotInstance): Promise<boolean> {
    try {
      // Basic health check - can be extended per provider
      const secureConfig = await this.secureConfigManager.getConfig(`bot_${bot.id}`);

      if (!secureConfig) {
        debug(`No secure config found for bot ${bot.name}`);
        return false;
      }

      // Add provider-specific health checks here
      switch (bot.messageProvider.toLowerCase()) {
        case 'discord':
          return this.checkDiscordBotHealth(bot, secureConfig.data);
        case 'slack':
          return this.checkSlackBotHealth(bot, secureConfig.data);
        case 'mattermost':
          return this.checkMattermostBotHealth(bot, secureConfig.data);
        case 'telegram':
          return this.checkTelegramBotHealth(bot, secureConfig.data);
        default:
          return true; // Unknown provider, assume healthy
      }
    } catch (error: unknown) {
      debug(`Health check failed for bot ${bot.name}:`, ErrorUtils.getMessage(error));
      return false;
    }
  }

  private async checkDiscordBotHealth(
    bot: BotInstance,
    config: Record<string, unknown>
  ): Promise<boolean> {
    // Discord-specific health check
    const discordConfig = config?.discord as Record<string, unknown>;
    return !!(discordConfig?.token && typeof discordConfig.token === 'string');
  }

  private async checkSlackBotHealth(
    bot: BotInstance,
    config: Record<string, unknown>
  ): Promise<boolean> {
    // Slack-specific health check
    const slackConfig = config?.slack as Record<string, unknown>;
    return !!(slackConfig?.botToken && typeof slackConfig.botToken === 'string');
  }

  private async checkMattermostBotHealth(
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

  private async checkTelegramBotHealth(
    bot: BotInstance,
    config: Record<string, unknown>
  ): Promise<boolean> {
    // Telegram-specific health check
    const telegramConfig = config?.telegram as Record<string, unknown>;
    return !!(telegramConfig?.token && typeof telegramConfig.token === 'string');
  }
}
