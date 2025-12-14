import { Client, GatewayIntentBits, Message, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import Debug from 'debug';
import discordConfig from '../../config/discordConfig';
import DiscordMessage from './DiscordMessage';
import { IMessage } from '../../message/interfaces/IMessage';
import { IMessengerService } from '../../message/interfaces/IMessengerService';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import {
  ValidationError,
  ConfigurationError,
  NetworkError,
  RateLimitError
} from '../../types/errorClasses';
import { connectToVoiceChannel } from './interaction/connectToVoiceChannel';
// import { VoiceCommandHandler } from './voice/voiceCommandHandler';
// import { VoiceChannelManager } from './voice/voiceChannelManager';
// import { AudioRecorder } from './voice/audioRecorder';
// import { VoiceActivityDetection } from './voice/voiceActivityDetection';
import * as fs from 'fs';
import * as path from 'path';
import ProviderConfigManager from '../../config/ProviderConfigManager';
// Optional channel routing feature flag and router
import messageConfig from '../../config/messageConfig';
// ChannelRouter exports functions, not a class
import { pickBestChannel, computeScore as channelComputeScore } from '../../message/routing/ChannelRouter';
import WebSocketService from '../../server/services/WebSocketService';
import { handleSpeckitSpecify } from './handlers/speckit/specifyHandler';
import { SpecifyCommand } from './commands/speckit/specify';
import { EventEmitter } from 'events';

// Defensive fallback for environments where GatewayIntentBits may be undefined (e.g., partial mocks)
const SafeGatewayIntentBits: any = (GatewayIntentBits as any) || {};

const log = Debug('app:discordService');

interface Bot {
  client: Client;
  botUserId: string;
  botUserName: string;
  config: any;
}

export const Discord = {
  /**
   * DiscordService - High-level Discord integration service implementing IMessengerService
   *
   * ARCHITECTURE OVERVIEW:
   * - Multi-bot support: Can manage multiple Discord bot instances
   * - Legacy compatibility: Supports both new configuration system and legacy formats
   * - Platform abstraction: Provides Discord-specific implementation of IMessengerService
   * - Error handling: Comprehensive validation and error reporting
   *
   * CONFIGURATION SOURCES (in order of priority):
   * 1. New BotConfigurationManager (recommended)
   * 2. Environment variables (DISCORD_BOT_TOKEN)
   * 3. Legacy config files (messengers.json)
   *
   * USAGE PATTERNS:
   * - Single bot: DISCORD_BOT_TOKEN="your-token"
   * - Multi-bot: DISCORD_BOT_TOKEN="token1,token2,token3"
   * - Config file: Use BotConfigurationManager for complex setups
   *
   * @example
   * ```typescript
   * // Basic initialization
   * const service = Discord.DiscordService.getInstance();
   * await service.initialize();
   *
   * // Multi-bot setup
   * const bots = service.getAllBots();
   * console.log(`Running ${bots.length} Discord bots`);
   *
   * // Send message as specific bot
   * await service.sendMessageToChannel("123456789", "Hello", "Bot #2");
   * ```
   */
  DiscordService: class extends EventEmitter implements IMessengerService {
    private static instance: DiscordService;
    private bots: Bot[] = [];
    private handlerSet: boolean = false;
    private voiceManager: any;
    private currentHandler?: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>;
    private configCache = new Map<string, any>();
    private lastConfigCheck = 0;
    private readonly CONFIG_CACHE_TTL = 60000; // 1 minute
    private messageRateLimit = new Map<string, number[]>();
    private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
    private readonly RATE_LIMIT_MAX = 10; // 10 messages per minute

    // Channel prioritization parity hooks (gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
    public supportsChannelPrioritization: boolean = true;

    // Use SafeGatewayIntentBits fallbacks to avoid crashes if discord.js intents are unavailable
    private static readonly intents = [
      SafeGatewayIntentBits.Guilds ?? (1 << 0),
      SafeGatewayIntentBits.GuildMessages ?? (1 << 9),
      SafeGatewayIntentBits.MessageContent ?? (1 << 15),
      SafeGatewayIntentBits.GuildVoiceStates ?? (1 << 7),
    ];

    /**
     * Constructor handles multi-bot initialization from various configuration sources.
     *
     * CONFIGURATION PRIORITY:
     * 1. Test mode: Uses legacy configuration for test compatibility
     * 2. New system: Uses BotConfigurationManager for multi-bot setups
     * 3. Legacy fallback: Environment variables or config files
     *
     * ERROR HANDLING:
     * - Validates all tokens before initialization
     * - Provides clear error messages for configuration issues
     * - Supports graceful degradation with fallback options
     */
    public constructor() {
      super();
      // Initialize is now async/called explicitly, but constructor prepares the bots array.
      // We defer full loading to initialize() or do it here?
      // Constructor used to load legacy sync.
      // We will load synchronously here for compatibility, but using ProviderConfigManager.
      this.loadBotsFromConfig();
    }

    private loadBotsFromConfig(): void {
      const configManager = BotConfigurationManager.getInstance();
      const providerManager = ProviderConfigManager.getInstance();

      const botConfigs = configManager.getDiscordBotConfigs();
      const providers = providerManager.getAllProviders('message').filter(p => p.type === 'discord' && p.enabled);

      if (providers.length === 0) {
        // Fallback: Check for legacy DISCORD_BOT_TOKEN environment variable
        const legacyToken = process.env.DISCORD_BOT_TOKEN;
        if (legacyToken) {
          log('Found DISCORD_BOT_TOKEN env var, using as single provider');
          // Create an ad-hoc provider config
          this.addBotToPool(legacyToken, 'Discord Bot', {
            name: 'Discord Bot',
            messageProvider: 'discord',
            discord: { token: legacyToken }
          });
          return;
        }

        log('No Discord providers configured.');
        return; // No tokens, no bots.
      }

      if (botConfigs.length > 0) {
        // Mode A: Logical Bots Defined (Match to Providers)
        botConfigs.forEach(botConfig => {
          // Find matching provider by ID, or fallback to first/default
          let provider = providers.find(p => p.id === botConfig.messageProviderId);
          if (!provider) {
            // Heuristic: If only 1 provider exists, use it.
            if (providers.length === 1) provider = providers[0];
            // Heuristic: If multiple, maybe match by name? Or default?
            // For now, if no ID match and >1 providers, we might skip or default.
            // Defaulting to first is unsafe if they are different identities.
            // But for backward compat (migration), if bot has no ID, and we have migrated 1 provider...
          }

          if (provider && provider.config.token) {
            this.addBotToPool(provider.config.token, botConfig.name, botConfig);
          } else {
            console.log(`Bot ${botConfig.name} has no matching/valid Discord provider. Skipping.`);
          }
        });
      } else {
        // Mode B: No Logical Bots (Ad-Hoc / Legacy Mode / Test Mode)
        // Create one bot per Provider Instance
        providers.forEach((provider, index) => {
          if (provider.config.token) {
            const name = provider.name || `Discord Bot ${index + 1}`;
            // Create a dummy bot config
            const dummyConfig = {
              name,
              messageProvider: 'discord',
              // Default to first available LLM or flowise as fallback
              llmProvider: 'flowise',
              ...provider.config
            };
            this.addBotToPool(provider.config.token, name, dummyConfig);
          }
        });
      }

      // Final Fallback: If no bots were added (due to mismatch or empty config), try env var
      if (this.bots.length === 0 && process.env.DISCORD_BOT_TOKEN) {
        const legacyToken = process.env.DISCORD_BOT_TOKEN;
        console.log('Fallback: No bots matched config, using DISCORD_BOT_TOKEN env var as "Discord Bot"');
        this.addBotToPool(legacyToken, 'Discord Bot', {
          name: 'Discord Bot',
          messageProvider: 'discord',
          discord: { token: legacyToken }
        });
      }
    }

    private addBotToPool(token: string, name: string, config: any): void {
      const client = new Client({ intents: Discord.DiscordService.intents });
      this.bots.push({
        client,
        botUserId: '',
        botUserName: name,
        config: {
          ...config,
          discord: { token, ...config.discord },
          token // Ensure root token property exists for legacy checks
        }
      });
    }



    public static getInstance(): DiscordService {
      if (!Discord.DiscordService.instance) {
        try {
          Discord.DiscordService.instance = new Discord.DiscordService();
        } catch (error: unknown) {
          if (error instanceof ValidationError || error instanceof ConfigurationError) {
            console.error('Discord service instance creation error:', error);
            throw error;
          }

          const networkError = new NetworkError(
            `Failed to create DiscordService instance: ${error instanceof Error ? error.message : String(error)}`,
            { status: 500, data: 'DISCORD_SERVICE_INIT_ERROR' } as any,
            { url: 'service-initialization', originalError: error } as any
          );

          console.error('Discord service instance creation network error:', networkError);
          throw networkError;
        }
      }
      return Discord.DiscordService.instance;
    }

    public getAllBots(): Bot[] {
      return this.bots;
    }

    public getClient(index = 0): Client {
      return this.bots[index]?.client || this.bots[0].client;
    }

    public async initialize(): Promise<void> {
      // If no bots are configured at all, surface a clear warning and skip.
      if (!this.bots || this.bots.length === 0) {
        log('DiscordService.initialize(): no Discord bots configured. Skipping Discord initialization.');
        return;
      }

      // Validate tokens before initializing - log which bots are invalid instead of silently failing.
      const invalidBots = this.bots
        .map((bot, index) => {
          const token = bot.config.token || bot.config.discord?.token;
          const trimmed = token ? token.trim() : '';
          return !trimmed
            ? { index, name: bot.botUserName || bot.config.name || `bot#${index + 1}` }
            : null;
        })
        .filter((b): b is { index: number; name: string } => !!b);

      if (invalidBots.length > 0) {
        log(
          `DiscordService.initialize(): found ${invalidBots.length} bot(s) with missing/empty tokens: ` +
          invalidBots.map(b => b.name).join(', ')
        );
        throw new ValidationError(
          'Cannot initialize DiscordService: One or more bot tokens are empty',
          'DISCORD_EMPTY_TOKENS_INIT'
        );
      }

      log(`DiscordService.initialize(): starting login for ${this.bots.length} Discord bot(s).`);

      const loginPromises = this.bots.map((bot) => {
        return new Promise<void>(async (resolve) => {
          bot.client.once('ready', () => {
            const user = bot.client.user;
            // Structured debug: confirm Discord identity on startup
            log(
              `Discord bot ready: name=${bot.botUserName}, tag=${user?.tag}, id=${user?.id}, username=${user?.username}`
            );
            bot.botUserId = user?.id || '';
            log(`Initialized ${bot.botUserName} OK`);
            resolve();
          });

          try {
            const token = (bot.config.token || bot.config.discord?.token || '').trim();
            log(`DiscordService.initialize(): initiating login for bot=${bot.botUserName}`);
            await bot.client.login(token);
            log(`DiscordService.initialize(): login call completed for bot=${bot.botUserName}`);
          } catch (err: any) {
            log(
              `DiscordService.initialize(): failed to login bot=${bot.botUserName}: ${err?.message || String(err)}`
            );
            resolve();
          }
        });
      });

      await Promise.all(loginPromises);

      // Initialize voice manager after bots are ready
      const { VoiceChannelManager } = require('./voice/voiceChannelManager');
      this.voiceManager = new VoiceChannelManager(this.bots[0].client);

      // Set up interaction handler for slash commands
      this.setInteractionHandler();

      console.log('!!! EMITTING service-ready FOR DiscordService !!!');
      console.log('!!! DiscordService EMITTER INSTANCE:', this);
      const startupGreetingService = require('../../services/StartupGreetingService').default;
      startupGreetingService.emit('service-ready', this);
    }

    public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void {
      if (this.handlerSet) return;
      this.handlerSet = true;
      this.currentHandler = handler;

      this.bots.forEach((bot) => {
        bot.client.on('messageCreate', async (message) => {
          try {
            // Defensive guards for malformed events and bots
            if (!message || !message.author || message.author.bot) return;
            if (!message.channelId) return;

            // Emit incoming message flow event
            try {
              WebSocketService.getInstance().recordMessageFlow({
                botName: bot.botUserName,
                provider: 'discord',
                channelId: message.channelId,
                userId: message.author.id,
                messageType: 'incoming',
                contentLength: (message.content || '').length,
                status: 'success'
              });
            } catch { }

            const wrappedMessage = new DiscordMessage(message);
            const history = await this.getMessagesFromChannel(message.channelId);
            await handler(wrappedMessage, history, bot.config);
          } catch {
            // Swallow malformed events to avoid crashing handler loop
            return;
          }
        });
      });
    }

    public setInteractionHandler(): void {
      this.bots.forEach((bot) => {
        bot.client.on('interactionCreate', async (interaction) => {
          if (!interaction.isCommand()) return;

          if (!interaction.isChatInputCommand()) return;
          const commandName = interaction.commandName;
          const subcommand = interaction.options.getSubcommand();

          if (commandName === 'speckit' && subcommand === 'specify') {
            await handleSpeckitSpecify(interaction);
          }
        });
      });
    }

    /**
     * Add a Discord bot instance at runtime (admin-hot-add) using minimal legacy config shape.
     */
    public async addBot(botConfig: any): Promise<void> {
      const token = botConfig?.discord?.token || botConfig?.token;
      const name = botConfig?.name || `Bot${this.bots.length + 1}`;
      if (!token) {
        throw new ValidationError('Discord addBot requires a token', 'DISCORD_ADDBOT_MISSING_TOKEN');
      }

      const client = new Client({ intents: Discord.DiscordService.intents });
      const newBot: Bot = {
        client,
        botUserId: '',
        botUserName: name,
        config: {
          name,
          token,
          discord: { token },
          llmProvider: 'flowise',
          llm: botConfig?.llm || undefined
        }
      };
      this.bots.push(newBot);

      if (this.currentHandler) {
        client.on('messageCreate', async (message) => {
          try {
            if (!message || !message.author || message.author.bot) return;
            if (!message.channelId) return;
            const wrappedMessage = new DiscordMessage(message);
            const history = await this.getMessagesFromChannel(message.channelId);
            await this.currentHandler!(wrappedMessage, history, newBot.config);
          } catch {
            return;
          }
        });
      }

      await new Promise<void>((resolve, reject) => {
        client.once('ready', () => {
          log(`Discord ${name} logged in as ${client.user?.tag}`);
          newBot.botUserId = client.user?.id || '';
          resolve();
        });
        client.login(token).catch(reject);
      });
    }

    /**
     * Sends a message to a Discord channel using the specified bot instance
     * @param channelId The target channel ID
     * @param text The message text to send
     * @param senderName Optional bot instance name (e.g. "Madgwick AI #2")
     * @param threadId Optional thread ID if sending to a thread
     * @returns The message ID or empty string on failure
     * @throws Error if no bots are available
     */
    public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
      // Input validation for security
      if (!channelId || typeof channelId !== 'string') {
        throw new ValidationError('Invalid channel ID provided', 'DISCORD_INVALID_CHANNEL_ID');
      }

      if (!text || typeof text !== 'string') {
        throw new ValidationError('Invalid message text provided', 'DISCORD_INVALID_MESSAGE_TEXT');
      }

      // Security: Limit message length to prevent abuse
      if (text.length > 2000) {
        throw new ValidationError('Message text exceeds maximum length of 2000 characters', 'DISCORD_MESSAGE_TOO_LONG');
      }

      // Security: Basic content filtering (can be enhanced)
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
          throw new ValidationError('Message contains potentially malicious content', 'DISCORD_MALICIOUS_CONTENT');
        }
      }

      if (this.bots.length === 0) {
        throw new ConfigurationError('No Discord bot instances available', 'DISCORD_NO_BOTS_AVAILABLE');
      }

      // Rate limiting check
      if (!this.checkRateLimit(channelId)) {
        throw new RateLimitError('Rate limit exceeded. Please wait before sending more messages.', 60);
      }

      const botInfo = this.bots.find((b) => b.botUserName === senderName) || this.bots[0];

      // Feature-flagged channel routing: select best channel among candidates
      let selectedChannelId = channelId;
      try {
        // Use string key to avoid TypeScript Path typing issues; messageConfig supports runtime keys
        const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (enabled) {
          const defaultChannel = this.getDefaultChannel();
          const candidates = Array.from(new Set([channelId, defaultChannel].filter(Boolean))) as string[];
          if (candidates.length > 0) {
            const picked = pickBestChannel(candidates, {
              provider: 'discord',
              botName: botInfo.botUserName,
            });
            if (picked) {
              selectedChannelId = picked;
              log(`ChannelRouter enabled: candidates=${JSON.stringify(candidates)} selected=${selectedChannelId}`);
            } else {
              log(`ChannelRouter returned null; falling back to provided channelId=${channelId}`);
            }
          }
        }
      } catch (err: any) {
        // Fail open to original behavior on any config/routing issues
        log(`ChannelRouter disabled due to error or misconfig: ${err?.message ?? err}`);
        selectedChannelId = channelId;
      }

      try {
        log(`Sending to channel ${selectedChannelId} as ${senderName}`);
        const channel = await botInfo.client.channels.fetch(selectedChannelId);
        if (!channel || !channel.isTextBased()) {
          throw new ValidationError(`Channel ${selectedChannelId} is not text-based or was not found`, 'DISCORD_INVALID_CHANNEL');
        }

        let message;
        if (threadId) {
          const thread = await botInfo.client.channels.fetch(threadId);
          if (!thread || !thread.isThread()) {
            throw new ValidationError(`Thread ${threadId} is not a valid thread or was not found`, 'DISCORD_INVALID_THREAD');
          }
          message = await thread.send(text);
        } else {
          log(`Attempting send to channel ${selectedChannelId}: *${senderName}*: ${text}`);
          message = await (channel as TextChannel | NewsChannel | ThreadChannel).send(text);
        }

        log(`Sent message ${message.id} to channel ${selectedChannelId}${threadId ? `/${threadId}` : ''}`);
        // Emit outgoing message flow event
        try {
          WebSocketService.getInstance().recordMessageFlow({
            botName: botInfo.botUserName,
            provider: 'discord',
            channelId: selectedChannelId,
            userId: '',
            messageType: 'outgoing',
            contentLength: (text || '').length,
            status: 'success'
          });
        } catch { }
        return message.id;
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          log(`Validation error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${error.message}`);
          console.error('Discord send message validation error:', error);
          try {
            WebSocketService.getInstance().recordAlert({
              level: 'error',
              title: 'Discord sendMessage validation failed',
              message: error.message,
              botName: botInfo.botUserName,
              metadata: { channelId: selectedChannelId, errorType: 'ValidationError' }
            });
          } catch { }
          return '';
        }

        const networkError = new NetworkError(
          `Failed to send message to channel ${selectedChannelId}: ${error instanceof Error ? error.message : String(error)}`,
          { status: 500, data: 'DISCORD_SEND_MESSAGE_ERROR' } as any,
          { url: selectedChannelId, originalError: error } as any
        );

        log(`Network error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${networkError.message}`);
        console.error('Discord send message network error:', networkError);
        try {
          WebSocketService.getInstance().recordAlert({
            level: 'error',
            title: 'Discord sendMessage failed',
            message: networkError.message,
            botName: botInfo.botUserName,
            metadata: { channelId: selectedChannelId, errorType: 'NetworkError' }
          });
        } catch { }
        return '';
      }
    }

    public async sendMessage(channelId: string, text: string, senderName?: string): Promise<string> {
      return this.sendMessageToChannel(channelId, text, senderName);
    }

    public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
      const rawMessages = await this.fetchMessages(channelId);
      // Enforce global cap from config to satisfy tests expecting hard cap
      const cap = (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
      const limited = rawMessages.slice(0, cap);
      return limited.map(msg => new DiscordMessage(msg));
    }

    public async getMessages(channelId: string): Promise<IMessage[]> {
      return this.getMessagesFromChannel(channelId);
    }

    public async fetchMessages(channelId: string): Promise<Message[]> {
      const botInfo = this.bots[0];
      try {
        const channel = await botInfo.client.channels.fetch(channelId);
        if (!channel || (typeof (channel as any).isTextBased === 'function' && !(channel as any).isTextBased())) {
          throw new Error('Channel is not text-based or was not found');
        }
        const limit = (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
        const messages = await (channel as TextChannel).messages.fetch({ limit });
        const arr = Array.from(messages.values());
        // Enforce hard cap as an extra safety to satisfy test expectation even if fetch ignores limit
        return arr.slice(0, limit);
      } catch (error: unknown) {
        const networkError = new NetworkError(
          `Failed to fetch messages from ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
          { status: 500, data: 'DISCORD_FETCH_MESSAGES_ERROR' } as any,
          { url: channelId, originalError: error } as any
        );

        log(`Network error fetching messages from ${channelId}: ${networkError.message}`);
        console.error('Discord fetch messages network error:', networkError);

        // Record alert if needed
        try {
          WebSocketService.getInstance().recordAlert({
            level: 'error',
            title: 'Discord fetch messages failed',
            message: networkError.message,
            botName: botInfo.botUserName,
            metadata: { channelId, errorType: 'NetworkError' }
          });
        } catch { }

        return [];
      }
    }

    public async sendPublicAnnouncement(channelId: string, announcement: string, threadId?: string): Promise<void> {
      const botInfo = this.bots[0];
      const text = `**Announcement**: ${announcement}`;
      await this.sendMessageToChannel(channelId, text, botInfo.botUserName, threadId);
    }

    public getClientId(): string {
      return this.bots[0].botUserId || '';
    }

    public getDefaultChannel(): string {
      const cacheKey = 'DISCORD_DEFAULT_CHANNEL_ID';
      const now = Date.now();

      // Check cache first
      if (this.configCache.has(cacheKey) &&
        (now - this.lastConfigCheck) < this.CONFIG_CACHE_TTL) {
        return this.configCache.get(cacheKey);
      }

      // Update cache
      const channelId = (discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';
      this.configCache.set(cacheKey, channelId);
      this.lastConfigCheck = now;

      return channelId;
    }

    public async shutdown(): Promise<void> {
      for (const bot of this.bots) {
        await bot.client.destroy();
        log(`Bot ${bot.botUserName} shut down`);
      }
      Discord.DiscordService.instance = undefined as any;
    }

    /**
     * Get health status for all Discord bot instances
     */
    public getHealthStatus(): Record<string, any> {
      const botStatus: Record<string, any> = {};
      for (const bot of this.bots) {
        const status = bot.client.ws.status;
        const uptime = bot.client.uptime ? bot.client.uptime / 1000 : 0;
        botStatus[bot.botUserName] = {
          connected: status === 0, // 0 = READY
          status: ['READY', 'CONNECTING', 'RECONNECTING', 'IDLE', 'NEARLY', 'DISCONNECTED'][status] || 'UNKNOWN',
          uptime: uptime,
          ping: bot.client.ws.ping,
        };
      }
      return botStatus;
    }

    /**
     * Channel scoring hook for router parity.
     * Returns 0 when MESSAGE_CHANNEL_ROUTER_ENABLED is disabled.
     * Delegates to ChannelRouter.computeScore when enabled.
     */
    public scoreChannel(channelId: string, metadata?: Record<string, any>): number {
      try {
        const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (!enabled) return 0;
        return channelComputeScore(channelId, metadata);
      } catch (e) {
        log(`scoreChannel error; returning 0: ${e instanceof Error ? e.message : String(e)}`);
        return 0;
      }
    }

    public getBotByName(name: string): Bot | undefined {
      return this.bots.find((bot) => bot.botUserName === name);
    }

    /**
     * Check if the channel is within rate limits
     * @param channelId The channel ID to check
     * @returns true if within limits, false if rate limited
     */
    private checkRateLimit(channelId: string): boolean {
      const now = Date.now();
      const channelKey = `channel_${channelId}`;

      if (!this.messageRateLimit.has(channelKey)) {
        this.messageRateLimit.set(channelKey, []);
      }

      const timestamps = this.messageRateLimit.get(channelKey)!;

      // Remove timestamps outside the window
      const validTimestamps = timestamps.filter(ts => (now - ts) < this.RATE_LIMIT_WINDOW);
      this.messageRateLimit.set(channelKey, validTimestamps);

      // Check if under limit
      if (validTimestamps.length >= this.RATE_LIMIT_MAX) {
        return false;
      }

      // Add current timestamp
      validTimestamps.push(now);
      return true;
    }

    public async joinVoiceChannel(channelId: string): Promise<void> {
      if (!this.voiceManager) {
        const { VoiceChannelManager } = require('./voice/voiceChannelManager');
        this.voiceManager = new VoiceChannelManager(this.getClient());
      }
      await this.voiceManager.joinChannel(channelId, true);
      log(`Joined voice channel ${channelId} with full voice capabilities`);
    }

    public async leaveVoiceChannel(channelId: string): Promise<void> {
      if (!this.voiceManager) throw new ConfigurationError('Voice manager not initialized', 'DISCORD_VOICE_MANAGER_NOT_INIT');
      this.voiceManager.leaveChannel(channelId);
      log(`Left voice channel ${channelId}`);
    }

    public getVoiceChannels(): string[] {
      return this.voiceManager?.getActiveChannels() || [];
    }
  }
};

export const DiscordService = Discord.DiscordService;
export type DiscordService = InstanceType<typeof Discord.DiscordService>;
// This line is removed to break a circular dependency.
// The service is already exported as the default export of this module.
// // These lines are removed to break a circular dependency.
// The service is already exported as the default export of this module.
// export { DiscordService } from './DiscordService';
// export const DiscordService = Discord.DiscordService;
