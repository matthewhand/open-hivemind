import { BotConfigurationManager, BotConfig } from '@config/BotConfigurationManager';
import { SecureConfigManager } from '@config/SecureConfigManager';
import Debug from 'debug';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const debug = Debug('app:BotManager');

export interface BotInstance {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
  config: any;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost';
  llmProvider: 'openai' | 'flowise' | 'openwebui';
  config: {
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
}

export class BotManager extends EventEmitter {
  private static instance: BotManager;
  private botConfigManager: BotConfigurationManager;
  private secureConfigManager: SecureConfigManager;
  private customBots: Map<string, BotInstance> = new Map();
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
   * Load custom bots from file
   */
  private loadCustomBots(): void {
    try {
      if (fs.existsSync(this.botsFilePath)) {
        const data = fs.readFileSync(this.botsFilePath, 'utf8');
        const bots = JSON.parse(data);
        this.customBots.clear();
        Object.entries(bots).forEach(([id, bot]: [string, any]) => {
          this.customBots.set(id, bot);
        });
        debug(`Loaded ${this.customBots.size} custom bots`);
      }
    } catch (error) {
      debug('Error loading custom bots:', error);
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
    } catch (error) {
      debug('Error saving custom bots:', error);
      throw new Error('Failed to save custom bots');
    }
  }

  /**
   * Get all bot instances (both configured and custom)
   */
  public async getAllBots(): Promise<BotInstance[]> {
    try {
      const configuredBots = this.botConfigManager.getAllBots();
      const botInstances: BotInstance[] = [];

      // Add configured bots
      for (const bot of configuredBots) {
        const botInstance: BotInstance = {
          id: crypto.randomUUID(),
          name: bot.name,
          messageProvider: bot.messageProvider,
          llmProvider: bot.llmProvider,
          isActive: true, // Configured bots are considered active
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          config: this.sanitizeConfig(bot)
        };
        botInstances.push(botInstance);
      }

      // Add custom bots
      for (const bot of this.customBots.values()) {
        botInstances.push(bot);
      }

      debug(`Retrieved ${botInstances.length} bot instances`);
      return botInstances;
    } catch (error) {
      debug('Error getting all bots:', error);
      throw new Error('Failed to retrieve bot instances');
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
      const bot = bots.find(b => b.id === botId);

      if (bot) {
        debug(`Retrieved configured bot: ${bot.name} (${bot.id})`);
      } else {
        debug(`Bot not found: ${botId}`);
      }

      return bot || null;
    } catch (error) {
      debug('Error getting bot:', error);
      throw new Error('Failed to retrieve bot instance');
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
        llmProvider: request.llmProvider,
        isActive: false, // New bots start inactive
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        config: this.sanitizeConfig(request.config)
      };

      // Store sensitive configuration securely
      await this.storeSecureConfig(botId, request.config);

      // Add to custom bots
      this.customBots.set(botId, botInstance);
      this.saveCustomBots();

      debug(`Created new bot: ${request.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botCreated', botInstance);

      return botInstance;
    } catch (error: any) {
      debug('Error creating bot:', error);
      throw new Error(`Failed to create bot: ${error.message}`);
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

      // Create clone request
      const cloneRequest: CreateBotRequest = {
        name: newName,
        messageProvider: sourceBot.messageProvider as any,
        llmProvider: sourceBot.llmProvider as any,
        config: sourceBot.config
      };

      const clonedBot = await this.createBot(cloneRequest);

      debug(`Cloned bot ${sourceBot.name} (${botId}) to ${newName} (${clonedBot.id})`);

      // Emit event for real-time updates
      this.emit('botCloned', { sourceBot, clonedBot });

      return clonedBot;
    } catch (error: any) {
      debug('Error cloning bot:', error);
      throw new Error(`Failed to clone bot: ${error.message}`);
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
        config: updates.config ? this.sanitizeConfig({ ...existingBot.config, ...updates.config }) : existingBot.config
      };

      // Store updated secure config if provided
      if (updates.config) {
        await this.storeSecureConfig(botId, updates.config);
      }

      // Update in custom bots
      this.customBots.set(botId, updatedBot);
      this.saveCustomBots();

      debug(`Updated bot: ${updatedBot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botUpdated', updatedBot);

      return updatedBot;
    } catch (error: any) {
      debug('Error updating bot:', error);
      throw new Error(`Failed to update bot: ${error.message}`);
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

      // Remove from custom bots
      const deleted = this.customBots.delete(botId);

      if (deleted) {
        this.saveCustomBots();

        // Remove secure configuration
        await this.secureConfigManager.deleteConfig(`bot_${botId}`);

        debug(`Deleted bot: ${bot.name} (${botId})`);

        // Emit event for real-time updates
        this.emit('botDeleted', bot);
      }

      return deleted;
    } catch (error: any) {
      debug('Error deleting bot:', error);
      throw new Error(`Failed to delete bot: ${error.message}`);
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

      // Update bot status
      const updatedBot = { ...bot, isActive: true, lastModified: new Date().toISOString() };
      this.customBots.set(botId, updatedBot);
      this.saveCustomBots();

      // TODO: Implement actual bot startup logic
      // This would involve initializing the appropriate service (Discord, Slack, etc.)

      debug(`Started bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botStarted', updatedBot);

      return true;
    } catch (error: any) {
      debug('Error starting bot:', error);
      throw new Error(`Failed to start bot: ${error.message}`);
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

      // Update bot status
      const updatedBot = { ...bot, isActive: false, lastModified: new Date().toISOString() };
      this.customBots.set(botId, updatedBot);
      this.saveCustomBots();

      // TODO: Implement actual bot shutdown logic

      debug(`Stopped bot: ${bot.name} (${botId})`);

      // Emit event for real-time updates
      this.emit('botStopped', updatedBot);

      return true;
    } catch (error: any) {
      debug('Error stopping bot:', error);
      throw new Error(`Failed to stop bot: ${error.message}`);
    }
  }

  /**
   * Validate create bot request
   */
  private validateCreateBotRequest(request: CreateBotRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Bot name is required');
    }

    if (!request.messageProvider || !['discord', 'slack', 'mattermost'].includes(request.messageProvider)) {
      throw new Error('Valid message provider is required (discord, slack, or mattermost)');
    }

    if (!request.llmProvider || !['openai', 'flowise', 'openwebui'].includes(request.llmProvider)) {
      throw new Error('Valid LLM provider is required (openai, flowise, or openwebui)');
    }

    this.validateBotConfig(request.config);
  }

  /**
   * Validate bot configuration
   */
  private validateBotConfig(config: any): void {
    // Validate message provider specific config
    if (config.discord) {
      if (!config.discord.token) {
        throw new Error('Discord bot token is required');
      }
    }

    if (config.slack) {
      if (!config.slack.botToken) {
        throw new Error('Slack bot token is required');
      }
      if (!config.slack.signingSecret) {
        throw new Error('Slack signing secret is required');
      }
    }

    if (config.mattermost) {
      if (!config.mattermost.serverUrl) {
        throw new Error('Mattermost server URL is required');
      }
      if (!config.mattermost.token) {
        throw new Error('Mattermost token is required');
      }
    }

    // Validate LLM provider specific config
    if (config.openai && !config.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (config.flowise && !config.flowise.apiKey) {
      throw new Error('Flowise API key is required');
    }

    if (config.openwebui && !config.openwebui.apiKey) {
      throw new Error('OpenWebUI API key is required');
    }
  }

  /**
   * Store sensitive configuration securely
   */
  private async storeSecureConfig(botId: string, config: any): Promise<void> {
    const secureConfigId = `bot_${botId}`;
    const secureData = {
      ...config,
      storedAt: new Date().toISOString()
    };

    await this.secureConfigManager.storeConfig({
      id: secureConfigId,
      name: `Bot ${botId} Configuration`,
      type: 'bot',
      data: secureData,
      createdAt: new Date().toISOString()
    } as any);
  }

  /**
   * Sanitize configuration by removing sensitive data
   */
  private sanitizeConfig(config: any): any {
    const sanitized = { ...config };

    // Remove sensitive fields
    if (sanitized.discord?.token) {
      sanitized.discord.token = '***';
    }
    if (sanitized.slack?.botToken) {
      sanitized.slack.botToken = '***';
    }
    if (sanitized.slack?.signingSecret) {
      sanitized.slack.signingSecret = '***';
    }
    if (sanitized.slack?.appToken) {
      sanitized.slack.appToken = '***';
    }
    if (sanitized.mattermost?.token) {
      sanitized.mattermost.token = '***';
    }
    if (sanitized.openai?.apiKey) {
      sanitized.openai.apiKey = '***';
    }
    if (sanitized.flowise?.apiKey) {
      sanitized.flowise.apiKey = '***';
    }
    if (sanitized.openwebui?.apiKey) {
      sanitized.openwebui.apiKey = '***';
    }

    return sanitized;
  }
}