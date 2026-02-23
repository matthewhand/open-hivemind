import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import {
  GatewayIntentBits,
  type Client,
  type Message,
  type NewsChannel,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js';
import type {
  IMessage,
  IMessengerService,
  IServiceDependencies,
  IBotConfig,
  IErrorTypes,
  ILogger,
  IWebSocketService,
  IChannelRouter,
  IConfigAccessor,
} from '@hivemind/shared-types';
import DiscordMessage from './DiscordMessage';
import { DiscordBotManager, type Bot } from './managers/DiscordBotManager';
import { DiscordEventHandler } from './managers/DiscordEventHandler';
import { DiscordMessageSender } from './managers/DiscordMessageSender';

// Defensive fallback for environments where GatewayIntentBits may be undefined (e.g., partial mocks)
const SafeGatewayIntentBits: any = (GatewayIntentBits as any) || {};

const log = Debug('app:discordService');

/**
 * DiscordService - High-level Discord integration service implementing IMessengerService
 * 
 * This service is fully decoupled from the main application through dependency injection.
 * All cross-cutting concerns (logging, metrics, WebSocket, channel routing) are injected
 * via IServiceDependencies.
 */
export class DiscordService extends EventEmitter implements IMessengerService {
  private static instance: DiscordService | undefined;
  private deps: IServiceDependencies;
  public botManager: DiscordBotManager;
  private messageSender: DiscordMessageSender;
  private eventHandler: DiscordEventHandler;
  private voiceManager: any;
  private configCache = new Map<string, any>();
  private lastConfigCheck = 0;
  private readonly CONFIG_CACHE_TTL = 60000; // 1 minute

  // Channel prioritization parity hooks (gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
  public supportsChannelPrioritization: boolean = true;

  // Use SafeGatewayIntentBits fallbacks to avoid crashes if discord.js intents are unavailable
  public static readonly intents = [
    SafeGatewayIntentBits.Guilds ?? 1 << 0,
    SafeGatewayIntentBits.GuildMessages ?? 1 << 9,
    SafeGatewayIntentBits.MessageContent ?? 1 << 15,
    SafeGatewayIntentBits.GuildVoiceStates ?? 1 << 7,
  ];

  /**
   * Create a new DiscordService instance with injected dependencies.
   * 
   * @param deps - Service dependencies for cross-cutting concerns
   */
  public constructor(deps: IServiceDependencies) {
    super();
    this.deps = deps;
    this.botManager = new DiscordBotManager(deps);
    this.messageSender = new DiscordMessageSender(this.botManager, deps);
    this.eventHandler = new DiscordEventHandler(this.botManager, deps, (channelId) =>
      this.getMessagesFromChannel(channelId)
    );
  }

  /**
   * Get the singleton instance (legacy compatibility).
   * @deprecated Use dependency injection instead
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      throw new Error(
        'DiscordService.getInstance() is deprecated. Use dependency injection to create instances.'
      );
    }
    return DiscordService.instance;
  }

  /**
   * Set the singleton instance (for backward compatibility during migration).
   * @deprecated Use dependency injection instead
   */
  public static setInstance(instance: DiscordService): void {
    DiscordService.instance = instance;
  }

  public getAllBots(): Bot[] {
    return this.botManager.getAllBots();
  }

  public getClient(index = 0): Client {
    return this.botManager.getClient(index);
  }

  public async initialize(): Promise<void> {
    await this.botManager.initializeBots();
    const bots = this.botManager.getAllBots();

    if (bots.length === 0) {
      return;
    }

    // Initialize voice manager after bots are ready
    const { VoiceChannelManager } = require('./voice/voiceChannelManager');
    this.voiceManager = new VoiceChannelManager(this.botManager.getClient(0));

    // Set up interaction handler for slash commands
    this.setInteractionHandler();

    // ───────────────────────────────────────────────────────────────────────
    // Startup Banner: Bot-to-Bot Configuration
    // ───────────────────────────────────────────────────────────────────────
    const defaultChannel = this.getDefaultChannel();
    const messageConfig = this.deps.messageConfig;
    const ignoreBots = Boolean(messageConfig?.get('MESSAGE_IGNORE_BOTS'));
    const limitToDefault = Boolean(
      messageConfig?.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL')
    );
    const allowBotToBot = Boolean(messageConfig?.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    const onlyWhenSpokenTo = Boolean(messageConfig?.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
    const graceWindowMs =
      Number(messageConfig?.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || 300000;

    console.info('\n╔══════════════════════════════════════════════════════════════╗');
    console.info('║                 🤖 DISCORD BOT-TO-BOT CONFIG                 ║');
    console.info('╠══════════════════════════════════════════════════════════════╣');
    console.info(
      `║  MESSAGE_IGNORE_BOTS                    : ${ignoreBots ? '⛔ true (BLOCKS ALL)' : '✅ false'}`
    );
    console.info(
      `║  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT   : ${limitToDefault ? '⚠️  true' : '✅ false'}`
    );
    console.info(
      `║  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED   : ${allowBotToBot ? '✅ true' : '➖ false'}`
    );
    console.info(
      `║  MESSAGE_ONLY_WHEN_SPOKEN_TO            : ${onlyWhenSpokenTo ? '⚠️  true' : '✅ false'}`
    );
    console.info(
      `║  GRACE_WINDOW_MS                        : ${graceWindowMs}ms (${(graceWindowMs / 60000).toFixed(1)}min)`
    );
    console.info(`║  DEFAULT_CHANNEL_ID                     : ${defaultChannel || '(not set)'}`);
    console.info('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('!!! EMITTING service-ready FOR DiscordService !!!');
    console.log('!!! DiscordService EMITTER INSTANCE:', this);

    // Emit service-ready event via injected startup greeting service
    if (this.deps.startupGreetingService) {
      this.deps.startupGreetingService.emit('service-ready', this);
    }
  }

  public setMessageHandler(
    handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>
  ): void {
    this.eventHandler.setMessageHandler(handler);
  }

  public setInteractionHandler(): void {
    this.eventHandler.setInteractionHandler();
  }

  /**
   * Add a Discord bot instance at runtime (admin-hot-add) using minimal legacy config shape.
   */
  public async addBot(botConfig: any): Promise<void> {
    await this.botManager.addBot(botConfig);

    const bots = this.botManager.getAllBots();
    const newBot = bots[bots.length - 1]; // Assume last added

    this.eventHandler.attachListeners(newBot);

    await new Promise<void>((resolve, reject) => {
      newBot.client.once('ready', () => {
        log(`Discord ${newBot.botUserName} logged in as ${newBot.client.user?.tag}`);
        newBot.botUserId = newBot.client.user?.id || '';
        try {
          newBot.config.BOT_ID = newBot.botUserId;
          newBot.config.discord = {
            ...(newBot.config.discord || {}),
            clientId: newBot.botUserId,
          };
        } catch { }
        resolve();
      });
      newBot.client.login(newBot.config.token).catch(reject);
    });
  }

  public async sendTyping(
    channelId: string,
    senderName?: string,
    threadId?: string
  ): Promise<void> {
    return this.messageSender.sendTyping(channelId, senderName, threadId);
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    replyToMessageId?: string
  ): Promise<string> {
    return this.messageSender.sendMessageToChannel(
      channelId,
      text,
      senderName,
      threadId,
      replyToMessageId
    );
  }

  public async sendMessage(
    channelId: string,
    text: string,
    senderName?: string
  ): Promise<string> {
    return this.messageSender.sendMessageToChannel(channelId, text, senderName);
  }

  public async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> {
    const rawMessages = await this.fetchMessages(channelId, limit);
    // Enforce global cap from config to satisfy tests expecting hard cap
    const discordConfig = this.deps.discordConfig;
    const cap = (discordConfig?.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
    const effective = typeof limit === 'number' && limit > 0 ? Math.min(limit, cap) : cap;
    const limited = rawMessages.slice(0, effective);
    return limited.map((msg) => new DiscordMessage(msg));
  }

  public async getMessages(channelId: string, limit?: number): Promise<IMessage[]> {
    return this.getMessagesFromChannel(channelId, limit);
  }

  public async fetchMessages(channelId: string, limitOverride?: number): Promise<Message[]> {
    const botInfo = this.botManager.getClient(0); // Use first bot/client
    const discordConfig = this.deps.discordConfig;
    const { NetworkError } = this.deps.errorTypes;

    try {
      const channel = await botInfo.channels.fetch(channelId);
      if (
        !channel ||
        (typeof (channel as any).isTextBased === 'function' && !(channel as any).isTextBased())
      ) {
        throw new Error('Channel is not text-based or was not found');
      }
      const cap =
        (discordConfig?.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
      const limit =
        typeof limitOverride === 'number' && limitOverride > 0
          ? Math.min(limitOverride, cap)
          : cap;
      const messages = await (channel as TextChannel).messages.fetch({ limit });
      const arr = Array.from(messages.values());
      // Enforce hard cap and reverse to oldest-first order (Discord returns newest-first)
      return arr.slice(0, limit).reverse();
    } catch (error: unknown) {
      const networkError = new NetworkError(
        `Failed to fetch messages from ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
        { status: 500, data: 'DISCORD_FETCH_MESSAGES_ERROR' } as any,
        { url: channelId, originalError: error } as any
      );

      log(`Network error fetching messages from ${channelId}: ${networkError.message}`);
      this.deps.logger.error('Discord fetch messages network error:', networkError);

      // Report to WebSocket service if available
      try {
        this.deps.webSocketService?.recordAlert({
          level: 'error',
          title: 'Discord fetch messages failed',
          message: networkError.message,
          botName: 'DiscordService',
          metadata: { channelId, errorType: 'NetworkError' },
        });
      } catch { }

      return [];
    }
  }

  public async getChannelTopic(channelId: string): Promise<string | null> {
    try {
      const client = this.botManager.getClient(0);
      if (!client) {
        return null;
      }
      const channel = await client.channels.fetch(channelId);
      if (channel && 'topic' in channel && typeof (channel as any).topic === 'string') {
        return (channel as any).topic || null;
      }
      return null;
    } catch (error) {
      log(`Error fetching channel topic for ${channelId}: ${error}`);
      return null;
    }
  }

  /**
   * Retrieves the owner ID of a Discord channel (guild owner or thread owner).
   * @param channelId The channel ID
   * @returns The owner ID string or null if not found
   */
  public async getChannelOwnerId(channelId: string): Promise<string | null> {
    try {
      const botInfo = this.botManager.getAllBots()[0];
      if (!botInfo) return null;

      const channel = await botInfo.client.channels.fetch(channelId);
      if (!channel) return null;

      // If it is a thread, it has ownerId
      if ('ownerId' in channel && typeof (channel as any).ownerId === 'string') {
        return (channel as any).ownerId;
      }

      // If it is a guild channel, return guild owner
      if ('guild' in channel) {
        const guild = (channel as any).guild;
        if (guild && 'ownerId' in guild) {
          return guild.ownerId;
        }
      }

      return null;
    } catch (error) {
      log(`Error fetching channel owner for ${channelId}: ${error}`);
      return null;
    }
  }

  public async sendPublicAnnouncement(
    channelId: string,
    announcement: string,
    threadId?: string
  ): Promise<void> {
    return this.messageSender.sendPublicAnnouncement(channelId, announcement, threadId);
  }

  public getClientId(): string {
    const bots = this.botManager.getAllBots();
    return bots[0]?.botUserId || '';
  }

  public getAgentStartupSummaries() {
    const safePrompt = (cfg: any): string => {
      const p =
        cfg?.OPENAI_SYSTEM_PROMPT ??
        cfg?.openai?.systemPrompt ??
        cfg?.SYSTEM_INSTRUCTION ??
        cfg?.systemInstruction ??
        cfg?.llm?.systemPrompt ??
        '';
      return typeof p === 'string' ? p : String(p || '');
    };

    const safeLlm = (
      cfg: any
    ): { llmProvider?: string; llmModel?: string; llmEndpoint?: string } => {
      const llmProvider =
        cfg?.LLM_PROVIDER ?? cfg?.llmProvider ?? cfg?.llm?.provider ?? undefined;

      const llmModel = cfg?.OPENAI_MODEL ?? cfg?.openai?.model ?? cfg?.llm?.model ?? undefined;

      const llmEndpoint =
        cfg?.OPENAI_BASE_URL ??
        cfg?.openai?.baseUrl ??
        cfg?.openwebui?.apiUrl ??
        cfg?.OPENSWARM_BASE_URL ??
        cfg?.openswarm?.baseUrl ??
        undefined;

      return {
        llmProvider: llmProvider ? String(llmProvider) : undefined,
        llmModel: llmModel ? String(llmModel) : undefined,
        llmEndpoint: llmEndpoint ? String(llmEndpoint) : undefined,
      };
    };

    return (this.botManager.getAllBots() || []).map((b) => {
      const cfg = b?.config || {};
      const { llmProvider, llmModel, llmEndpoint } = safeLlm(cfg);
      return {
        name: String(b?.botUserName || cfg?.name || 'DiscordBot'),
        provider: 'discord',
        botId: b?.botUserId ? String(b.botUserId) : undefined,
        messageProvider: 'discord',
        llmProvider,
        llmModel,
        llmEndpoint,
        systemPrompt: safePrompt(cfg),
      };
    });
  }

  public resolveAgentContext(params: { botConfig: any; agentDisplayName: string }) {
    try {
      const botConfig = params?.botConfig || {};
      const agentDisplayName = String(params?.agentDisplayName || '').trim();
      const agentInstanceName = String(botConfig?.name || '').trim();

      const isSnowflake = (v: unknown) => /^\d{15,25}$/.test(String(v || ''));

      const cfgId = isSnowflake(botConfig?.BOT_ID)
        ? String(botConfig.BOT_ID)
        : isSnowflake(botConfig?.discord?.clientId)
          ? String(botConfig.discord.clientId)
          : '';

      const byId = cfgId
        ? this.botManager
          .getAllBots()
          .find(
            (b) =>
              b.botUserId === cfgId ||
              b.config?.BOT_ID === cfgId ||
              b.config?.discord?.clientId === cfgId
          )
        : undefined;

      const byInstanceName = agentInstanceName ? this.getBotByName(agentInstanceName) : undefined;
      const byDisplayName = agentDisplayName ? this.getBotByName(agentDisplayName) : undefined;
      const byIdOrInstance = byId || byInstanceName;
      const bot = byIdOrInstance || byDisplayName;

      const botId = String(bot?.botUserId || cfgId || this.getClientId() || '');

      // In Discord swarm mode, use the snowflake id as a stable sender key to pick the correct instance.
      const senderKey = botId || agentInstanceName || agentDisplayName;

      const nameCandidates = Array.from(
        new Set(
          [
            agentDisplayName,
            agentInstanceName,
            bot?.botUserName,
            bot?.client?.user?.username,
            bot?.client?.user?.globalName,
          ]
            .filter(Boolean)
            .map((v) => String(v))
        )
      );

      return { botId, senderKey, nameCandidates };
    } catch {
      return null;
    }
  }

  public getDefaultChannel(): string {
    const cacheKey = 'DISCORD_DEFAULT_CHANNEL_ID';
    const now = Date.now();

    // Check cache first
    if (this.configCache.has(cacheKey) && now - this.lastConfigCheck < this.CONFIG_CACHE_TTL) {
      return this.configCache.get(cacheKey);
    }

    // Update cache
    const discordConfig = this.deps.discordConfig;
    const channelId =
      (discordConfig?.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';
    this.configCache.set(cacheKey, channelId);
    this.lastConfigCheck = now;

    return channelId;
  }

  public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
    try {
      // Find the bot to update
      let bot: Bot | undefined;
      const bots = this.botManager.getAllBots();
      if (senderKey) {
        bot = bots.find(
          (b) =>
            b.botUserName === senderKey ||
            b.botUserId === senderKey ||
            b.config?.name === senderKey
        );
      }
      if (!bot && bots.length > 0) {
        bot = bots[0]; // Default to first bot
      }

      if (bot?.client?.user) {
        bot.client.user.setActivity(modelId, { type: 0 }); // 0 = Playing
        log(`Set presence for ${bot.botUserName}: Playing ${modelId}`);
      }
    } catch (error) {
      log(`Failed to set model activity: ${error}`);
    }
  }

  public async shutdown(): Promise<void> {
    await this.botManager.shutdown();
    DiscordService.instance = undefined;
  }

  public async disconnectBot(botName: string): Promise<boolean> {
    return this.botManager.disconnectBot(botName);
  }

  public isBotConnected(botName: string): boolean {
    return this.botManager.isBotConnected(botName);
  }

  public getHealthStatus(): Record<string, any> {
    return this.botManager.getHealthStatus();
  }

  public scoreChannel(channelId: string, metadata?: Record<string, any>): number {
    try {
      const enabled = Boolean(this.deps.messageConfig?.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
      if (!enabled) {
        return 0;
      }
      return this.deps.channelRouter?.computeScore(channelId, metadata) ?? 0;
    } catch (e) {
      log(`scoreChannel error; returning 0: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  public getBotByName(name: string): Bot | undefined {
    return this.botManager.getBotByName(name);
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
    if (!this.voiceManager) {
      const { ConfigError } = this.deps.errorTypes;
      throw new ConfigError(
        'Voice manager not initialized',
        'DISCORD_VOICE_MANAGER_NOT_INIT'
      );
    }
    this.voiceManager.leaveChannel(channelId);
    log(`Left voice channel ${channelId}`);
  }

  public getVoiceChannels(): string[] {
    return this.voiceManager?.getActiveChannels() || [];
  }

  public getDelegatedServices(): Array<{
    serviceName: string;
    messengerService: IMessengerService;
    botConfig: any;
  }> {
    return this.botManager.getAllBots().map((bot, index) => {
      const botServiceName = `discord-${bot.botUserName || `bot${index + 1}`}`;

      const serviceWrapper: IMessengerService = {
        initialize: async () => {
          /* Already initialized by parent */
        },
        shutdown: async () => {
          /* Managed by parent */
        },

        sendMessageToChannel: async (
          channelId: string,
          message: string,
          senderName?: string,
          threadId?: string,
          replyToMessageId?: string
        ) => {
          return this.sendMessageToChannel(
            channelId,
            message,
            bot.botUserName,
            threadId,
            replyToMessageId
          );
        },

        getMessagesFromChannel: async (channelId: string) =>
          this.getMessagesFromChannel(channelId),

        sendPublicAnnouncement: async (channelId: string, announcement: any) =>
          this.sendPublicAnnouncement(channelId, announcement),

        getClientId: () => bot.botUserId,

        getDefaultChannel: () => this.getDefaultChannel(),

        setMessageHandler: (handler) => { },

        supportsChannelPrioritization: this.supportsChannelPrioritization,
        scoreChannel: this.scoreChannel
          ? (cid, meta) => this.scoreChannel!(cid, meta)
          : undefined,
      };

      return {
        serviceName: botServiceName,
        messengerService: serviceWrapper,
        botConfig: bot.config,
      };
    });
  }
}

// Export for backward compatibility
export const Discord = {
  DiscordService,
};
