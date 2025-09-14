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

      await this.startBotById(botId);

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

  /**
   * Start all configured bots
   */
  public async startAllConfiguredBots(): Promise<void> {
    try {
      debug('Starting all configured bots...');
      
      const allBots = await Promise.resolve(this.getAllBots());
      const startPromises = allBots.map(async (bot: any) => {
        try {
          if (bot.isActive) {
            await this.startBotById(bot.id);
            debug(`Started bot: ${bot.name}`);
          } else {
            debug(`Skipping inactive bot: ${bot.name}`);
          }
        } catch (error) {
          debug(`Failed to start bot ${bot.name}:`, error);
          this.emit('botError', { botId: bot.id, error });
        }
      });

      await Promise.allSettled(startPromises);
      
      const runningBots = this.getRunningBotsCount();
      debug(`Bot startup completed: ${runningBots}/${allBots.length} bots running`);
      
      this.emit('allBotsStarted', { total: allBots.length, running: runningBots });
      
    } catch (error) {
      debug('Error starting all bots:', error);
      throw error;
    }
  }

  /**
   * Stop all running bots
   */
  public async stopAllConfiguredBots(): Promise<void> {
    try {
      debug('Stopping all bots...');
      
      const allBots = await Promise.resolve(this.getAllBots());
      const stopPromises = allBots.map(async (bot: any) => {
        try {
          await this.stopBotById(bot.id);
          debug(`Stopped bot: ${bot.name}`);
        } catch (error) {
          debug(`Failed to stop bot ${bot.name}:`, error);
          this.emit('botError', { botId: bot.id, error });
        }
      });

      await Promise.allSettled(stopPromises);
      
      debug('All bots stopped');
      this.emit('allBotsStopped');
      
    } catch (error) {
      debug('Error stopping all bots:', error);
      throw error;
    }
  }

  /**
   * Start a specific bot by ID
   */
  public async startBotById(botId: string): Promise<void> {
    try {
      debug(`Starting bot: ${botId}`);
      
      const bot = this.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }

      if (this.isBotRunning(botId)) {
        debug(`Bot ${bot.name} is already running`);
        return;
      }

      // Initialize the bot based on its provider
      await this.initializeBotProvider(bot);
      
      // Mark bot as running (this would be tracked in a runtime state map)
      this.setBotRunningState(botId, true);
      
      debug(`Bot ${bot.name} started successfully`);
      this.emit('botStarted', { botId, name: bot.name });
      
    } catch (error) {
      debug(`Failed to start bot ${botId}:`, error);
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
      
      const bot = this.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot with ID ${botId} not found`);
      }

      if (!this.isBotRunning(botId)) {
        debug(`Bot ${bot.name} is not running`);
        return;
      }

      // Shutdown the bot provider
      await this.shutdownBotProvider(bot);
      
      // Mark bot as stopped
      this.setBotRunningState(botId, false);
      
      debug(`Bot ${bot.name} stopped successfully`);
      this.emit('botStopped', { botId, name: bot.name });
      
    } catch (error) {
      debug(`Failed to stop bot ${botId}:`, error);
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
      
      // Small delay to ensure clean shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.startBotById(botId);
      
      debug(`Bot ${botId} restarted successfully`);
      this.emit('botRestarted', { botId });
      
    } catch (error) {
      debug(`Failed to restart bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize bot provider (Discord, Slack, etc.)
   */
  private async initializeBotProvider(bot: BotInstance): Promise<void> {
    try {
      // Get secure configuration
      const secureConfig = await this.secureConfigManager.getConfig(`bot_${bot.id}`);
      
      switch (bot.messageProvider.toLowerCase()) {
        case 'discord':
          await this.initializeDiscordBot(bot, secureConfig?.data);
          break;
        case 'slack':
          await this.initializeSlackBot(bot, secureConfig?.data);
          break;
        case 'mattermost':
          await this.initializeMattermostBot(bot, secureConfig?.data);
          break;
        case 'telegram':
          await this.initializeTelegramBot(bot, secureConfig?.data);
          break;
        default:
          throw new Error(`Unsupported message provider: ${bot.messageProvider}`);
      }
    } catch (error) {
      debug(`Error initializing bot provider for ${bot.name}:`, error);
      throw error;
    }
  }

  /**
   * Shutdown bot provider
   */
  private async shutdownBotProvider(bot: BotInstance): Promise<void> {
    try {
      switch (bot.messageProvider.toLowerCase()) {
        case 'discord':
          await this.shutdownDiscordBot(bot);
          break;
        case 'slack':
          await this.shutdownSlackBot(bot);
          break;
        case 'mattermost':
          await this.shutdownMattermostBot(bot);
          break;
        case 'telegram':
          await this.shutdownTelegramBot(bot);
          break;
        default:
          debug(`Unknown message provider for shutdown: ${bot.messageProvider}`);
      }
    } catch (error) {
      debug(`Error shutting down bot provider for ${bot.name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize Discord bot
   */
  private async initializeDiscordBot(bot: BotInstance, secureConfig: any): Promise<void> {
    debug(`Initializing Discord bot: ${bot.name}`);
    
    if (!secureConfig?.discord?.token) {
      throw new Error('Discord token not found in secure configuration');
    }

    // Here you would initialize the Discord service with the bot's configuration
    // This is a placeholder - actual implementation would use DiscordService
    debug(`Discord bot ${bot.name} initialized with token: ${secureConfig.discord.token.substring(0, 10)}...`);
  }

  /**
   * Initialize Slack bot
   */
  private async initializeSlackBot(bot: BotInstance, secureConfig: any): Promise<void> {
    debug(`Initializing Slack bot: ${bot.name}`);
    
    if (!secureConfig?.slack?.botToken) {
      throw new Error('Slack bot token not found in secure configuration');
    }

    // Here you would initialize the Slack service with the bot's configuration
    debug(`Slack bot ${bot.name} initialized`);
  }

  /**
   * Initialize Mattermost bot
   */
  private async initializeMattermostBot(bot: BotInstance, secureConfig: any): Promise<void> {
    debug(`Initializing Mattermost bot: ${bot.name}`);
    
    if (!secureConfig?.mattermost?.token) {
      throw new Error('Mattermost token not found in secure configuration');
    }

    // Here you would initialize the Mattermost service
    debug(`Mattermost bot ${bot.name} initialized`);
  }

  /**
   * Initialize Telegram bot
   */
  private async initializeTelegramBot(bot: BotInstance, secureConfig: any): Promise<void> {
    debug(`Initializing Telegram bot: ${bot.name}`);
    
    if (!secureConfig?.telegram?.token) {
      throw new Error('Telegram token not found in secure configuration');
    }

    // Here you would initialize the Telegram service
    debug(`Telegram bot ${bot.name} initialized`);
  }

  /**
   * Shutdown Discord bot
   */
  private async shutdownDiscordBot(bot: BotInstance): Promise<void> {
    debug(`Shutting down Discord bot: ${bot.name}`);
    // Implementation for Discord shutdown
  }

  /**
   * Shutdown Slack bot
   */
  private async shutdownSlackBot(bot: BotInstance): Promise<void> {
    debug(`Shutting down Slack bot: ${bot.name}`);
    // Implementation for Slack shutdown
  }

  /**
   * Shutdown Mattermost bot
   */
  private async shutdownMattermostBot(bot: BotInstance): Promise<void> {
    debug(`Shutting down Mattermost bot: ${bot.name}`);
    // Implementation for Mattermost shutdown
  }

  /**
   * Shutdown Telegram bot
   */
  private async shutdownTelegramBot(bot: BotInstance): Promise<void> {
    debug(`Shutting down Telegram bot: ${bot.name}`);
    // Implementation for Telegram shutdown
  }

  // Runtime state management (in-memory tracking)
  private runningBots: Set<string> = new Set();

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
  public getBotsStatus(): Array<{
    id: string;
    name: string;
    provider: string;
    isRunning: boolean;
    isActive: boolean;
  }> {
    const allBots = this.getAllBots();
    return allBots.map((bot: any) => ({
      id: bot.id,
      name: bot.name,
      provider: bot.messageProvider,
      isRunning: this.isBotRunning(bot.id),
      isActive: bot.isActive
    }));
  }

  /**
   * Get system metrics
   */
  public getSystemMetrics(): {
    totalBots: number;
    runningBots: number;
    activeBots: number;
    systemUptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const allBots = this.getAllBots();
    const activeBots = allBots.filter((bot: any) => bot.isActive);
    
    return {
      totalBots: allBots.length,
      runningBots: this.getRunningBotsCount(),
      activeBots: activeBots.length,
      systemUptime: process.uptime() * 1000, // milliseconds
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Health check for all bots
   */
  public async performHealthCheck(): Promise<Array<{
    botId: string;
    name: string;
    status: 'healthy' | 'unhealthy' | 'stopped';
    lastCheck: Date;
    issues?: string[];
  }>> {
    const allBots = this.getAllBots();
    const healthChecks = allBots.map(async (bot: any) => {
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
      } catch (error) {
        status = 'unhealthy';
        issues.push(`Health check error: ${error}`);
      }

      return {
        botId: bot.id,
        name: bot.name,
        status,
        lastCheck: new Date(),
        issues: issues.length > 0 ? issues : undefined
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
    } catch (error) {
      debug(`Health check failed for bot ${bot.name}:`, error);
      return false;
    }
  }

  private async checkDiscordBotHealth(bot: BotInstance, config: any): Promise<boolean> {
    // Discord-specific health check
    return config?.discord?.token ? true : false;
  }

  private async checkSlackBotHealth(bot: BotInstance, config: any): Promise<boolean> {
    // Slack-specific health check
    return config?.slack?.botToken ? true : false;
  }

  private async checkMattermostBotHealth(bot: BotInstance, config: any): Promise<boolean> {
    // Mattermost-specific health check
    return config?.mattermost?.token && config?.mattermost?.serverUrl ? true : false;
  }

  private async checkTelegramBotHealth(bot: BotInstance, config: any): Promise<boolean> {
    // Telegram-specific health check
    return config?.telegram?.token ? true : false;
  }
}