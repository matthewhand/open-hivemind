import { EventEmitter } from 'events';
// import { VoiceCommandHandler } from './voice/voiceCommandHandler';
// import { VoiceChannelManager } from './voice/voiceChannelManager';
// import { AudioRecorder } from './voice/audioRecorder';
// import { VoiceActivityDetection } from './voice/voiceActivityDetection';
import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import {
  Client,
  GatewayIntentBits,
  type Message,
  type NewsChannel,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import discordConfig from '@config/discordConfig';
// Optional channel routing feature flag and router
import messageConfig from '@config/messageConfig';
import ProviderConfigManager from '@config/ProviderConfigManager';
import { UserConfigStore } from '@config/UserConfigStore';
import TypingActivity from '@message/helpers/processing/TypingActivity';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
// ChannelRouter exports functions, not a class
import {
  computeScore as channelComputeScore,
  pickBestChannel,
} from '@message/routing/ChannelRouter';
import WebSocketService from '../../../src/server/services/WebSocketService';
import {
  ConfigurationError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from '../../../src/types/errorClasses';
import { SpecifyCommand } from './commands/speckit/specify';
import DiscordMessage from './DiscordMessage';
import { handleSpeckitSpecify } from './handlers/speckit/specifyHandler';
import { connectToVoiceChannel } from './interaction/connectToVoiceChannel';

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
    private static instance: DiscordService | undefined;
    private bots: Bot[] = [];
    private handlerSet: boolean = false;
    private voiceManager: any;
    private currentHandler?: (
      message: IMessage,
      historyMessages: IMessage[],
      botConfig: any
    ) => Promise<string>;
    private configCache = new Map<string, any>();
    private lastConfigCheck = 0;
    private readonly CONFIG_CACHE_TTL = 60000; // 1 minute
    private messageRateLimit = new Map<string, number[]>();
    private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
    private readonly RATE_LIMIT_MAX = 3; // 3 messages per minute (lower to prevent runaway bot-to-bot conversations)

    // Channel prioritization parity hooks (gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
    public supportsChannelPrioritization: boolean = true;

    // Use SafeGatewayIntentBits fallbacks to avoid crashes if discord.js intents are unavailable
    private static readonly intents = [
      SafeGatewayIntentBits.Guilds ?? 1 << 0,
      SafeGatewayIntentBits.GuildMessages ?? 1 << 9,
      SafeGatewayIntentBits.MessageContent ?? 1 << 15,
      SafeGatewayIntentBits.GuildVoiceStates ?? 1 << 7,
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
      const userConfigStore = UserConfigStore.getInstance();

      const botConfigs = configManager.getDiscordBotConfigs();
      const providers = providerManager
        .getAllProviders('message')
        .filter((p) => p.type === 'discord' && p.enabled);

      if (providers.length === 0) {
        // Fallback: Check for legacy DISCORD_BOT_TOKEN environment variable
        const legacyToken = process.env.DISCORD_BOT_TOKEN;
        if (legacyToken) {
          log(
            'Found DISCORD_BOT_TOKEN env var, using as single provider (splitting by comma if multiple)'
          );
          const tokens = legacyToken
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          tokens.forEach((token, index) => {
            const name = tokens.length > 1 ? `Discord Bot ${index + 1}` : 'Discord Bot';
            this.addBotToPool(token, name, {
              name,
              messageProvider: 'discord',
              discord: { token },
            });
          });
          return;
        }

        if (botConfigs.length === 0) {
          log('No Discord providers configured.');
          return; // No tokens, no bots.
        }
      }

      if (botConfigs.length > 0) {
        // Mode A: Logical Bots Defined (Match to Providers)
        botConfigs.forEach((botConfig) => {
          // Check if bot is disabled in user config
          if (userConfigStore.isBotDisabled(botConfig.name)) {
            log(`Bot ${botConfig.name} is disabled in user config, skipping initialization.`);
            return;
          }

          // Find matching provider by ID, or fallback to first/default
          let provider = providers.find((p) => p.id === botConfig.messageProviderId);
          if (!provider) {
            // Heuristic: If only 1 provider exists, use it.
            if (providers.length === 1) {
              provider = providers[0];
            }
            // Heuristic: If multiple, maybe match by name? Or default?
            // For now, if no ID match and >1 providers, we might skip or default.
            // Defaulting to first is unsafe if they are different identities.
            // But for backward compat (migration), if bot has no ID, and we have migrated 1 provider...
          }

          if (provider && provider.config.token) {
            this.addBotToPool(provider.config.token, botConfig.name, botConfig);
          } else if (botConfig.discord?.token) {
            // Legacy/Manual Mode: Bot config has token directly (e.g. from loadLegacyConfiguration)
            this.addBotToPool(botConfig.discord.token, botConfig.name, botConfig);
          } else {
            log(`Bot ${botConfig.name} has no matching/valid Discord provider. Skipping.`);
          }
        });
      } else {
        // Mode B: No Logical Bots (Ad-Hoc / Legacy Mode / Test Mode)
        // Create one bot per Provider Instance
        providers.forEach((provider, index) => {
          if (provider.config.token) {
            const name = provider.name || `Discord Bot ${index + 1}`;

            // Check if bot is disabled in user config
            if (userConfigStore.isBotDisabled(name)) {
              log(`Bot ${name} is disabled in user config, skipping initialization.`);
              return;
            }

            // Create a dummy bot config
            const dummyConfig = {
              name,
              messageProvider: 'discord',
              // Default to first available LLM or flowise as fallback
              llmProvider: 'flowise',
              ...provider.config,
            };
            this.addBotToPool(provider.config.token, name, dummyConfig);
          }
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
          token, // Ensure root token property exists for legacy checks
        },
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
        log(
          'DiscordService.initialize(): no Discord bots configured. Skipping Discord initialization.'
        );
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
          invalidBots.map((b) => b.name).join(', ')
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
            // Persist resolved Discord client id back into the bot config so downstream
            // reply eligibility (mentions/replies) uses the correct per-instance ID.
            try {
              if (!bot.config) {
                bot.config = {};
              }
              bot.config.BOT_ID = bot.botUserId;
              bot.config.discord = { ...(bot.config.discord || {}), clientId: bot.botUserId };
            } catch { }
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

      // ───────────────────────────────────────────────────────────────────────
      // Startup Banner: Bot-to-Bot Configuration
      // ───────────────────────────────────────────────────────────────────────
      const defaultChannel = this.getDefaultChannel();
      const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
      const limitToDefault = Boolean(
        messageConfig.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL')
      );
      const allowBotToBot = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
      const onlyWhenSpokenTo = Boolean(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
      const graceWindowMs =
        Number(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || 300000;

      console.info('\n╔══════════════════════════════════════════════════════════════╗');
      console.info('║                 🤖 DISCORD BOT-TO-BOT CONFIG                 ║');
      console.info('╠══════════════════════════════════════════════════════════════╣');
      console.info(
        `║  MESSAGE_IGNORE_BOTS                    : ${ignoreBots ? '❌ true (BLOCKS ALL)' : '✅ false'}`
      );
      console.info(
        `║  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT   : ${limitToDefault ? '⚠️  true' : '✅ false'}`
      );
      console.info(
        `║  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED   : ${allowBotToBot ? '✅ true' : '❌ false'}`
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
      const startupGreetingService = require('@services/StartupGreetingService').default;
      startupGreetingService.emit('service-ready', this);
    }

    public setMessageHandler(
      handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>
    ): void {
      if (this.handlerSet) {
        return;
      }
      this.handlerSet = true;
      this.currentHandler = handler;

      this.bots.forEach((bot) => {
        // Track other users typing (used for pre-typing delay heuristics).
        bot.client.on('typingStart', (typing: any) => {
          try {
            const user = (typing as any)?.user;
            const channel = (typing as any)?.channel;
            const channelId = (typing as any)?.channelId ?? channel?.id;
            if (!channelId || !user) {
              return;
            }
            if (user.bot) {
              return;
            }
            TypingActivity.getInstance().recordTyping(String(channelId), String(user.id));
          } catch { }
        });

        bot.client.on('messageCreate', async (message) => {
          try {
            // Defensive guards for malformed events
            if (!message || !message.author) {
              return;
            }
            if (!message.channelId) {
              return;
            }

            // Config-based bot message handling
            // Logic moved to centralized handler (shouldReplyToMessage) works for complex logic,
            // but we must respect basic platform flags like MESSAGE_IGNORE_BOTS here at the gate.
            const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
            if (ignoreBots && message.author.bot) {
              return;
            }

            // Emit incoming message flow event
            try {
              WebSocketService.getInstance().recordMessageFlow({
                botName: bot.botUserName,
                provider: 'discord',
                channelId: message.channelId,
                userId: message.author.id,
                messageType: 'incoming',
                contentLength: (message.content || '').length,
                status: 'success',
              });
            } catch { }

            let repliedMessage: any = null;
            try {
              const refId = (message as any)?.reference?.messageId;
              if (refId && message.channel && (message.channel as any).messages?.fetch) {
                repliedMessage = await (message.channel as any).messages
                  .fetch(refId)
                  .catch(() => null);
              }
            } catch {
              repliedMessage = null;
            }

            const wrappedMessage = new DiscordMessage(message, repliedMessage);
            const history = await this.getMessagesFromChannel(message.channelId);
            await handler(wrappedMessage, history, bot.config);
          } catch (error) {
            // Log error but don't crash handler loop
            console.error(`Error in Discord message handler for bot ${bot.botUserName}:`, error);
            return;
          }
        });
      });
    }

    public setInteractionHandler(): void {
      this.bots.forEach((bot) => {
        bot.client.on('interactionCreate', async (interaction) => {
          if (!interaction.isCommand()) {
            return;
          }

          if (!interaction.isChatInputCommand()) {
            return;
          }
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
        throw new ValidationError(
          'Discord addBot requires a token',
          'DISCORD_ADDBOT_MISSING_TOKEN'
        );
      }

      const client = new Client({ intents: Discord.DiscordService.intents });
      const newBot: Bot = {
        client,
        botUserId: '',
        botUserName: name,
        config: {
          ...botConfig, // Copy all config including system prompts
          name,
          token,
          discord: { ...botConfig?.discord, token },
          llmProvider: botConfig?.llmProvider || 'flowise',
          llm: botConfig?.llm || undefined,
        },
      };
      this.bots.push(newBot);

      if (this.currentHandler) {
        // Track other users typing (used for pre-typing delay heuristics).
        client.on('typingStart', (typing: any) => {
          try {
            const user = (typing as any)?.user;
            const channel = (typing as any)?.channel;
            const channelId = (typing as any)?.channelId ?? channel?.id;
            if (!channelId || !user) {
              return;
            }
            if (user.bot) {
              return;
            }
            TypingActivity.getInstance().recordTyping(String(channelId), String(user.id));
          } catch { }
        });

        client.on('messageCreate', async (message) => {
          try {
            if (!message || !message.author) {
              return;
            }
            if (!message.channelId) {
              return;
            }

            // Config-based bot message handling (same as main handler)
            // Logic moved to centralized handler (shouldReplyToMessage)

            let repliedMessage: any = null;
            try {
              const refId = (message as any)?.reference?.messageId;
              if (refId && message.channel && (message.channel as any).messages?.fetch) {
                repliedMessage = await (message.channel as any).messages
                  .fetch(refId)
                  .catch(() => null);
              }
            } catch {
              repliedMessage = null;
            }

            const wrappedMessage = new DiscordMessage(message, repliedMessage);
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
          // Persist resolved client id into config for consistent downstream mention detection.
          try {
            newBot.config.BOT_ID = newBot.botUserId;
            newBot.config.discord = {
              ...(newBot.config.discord || {}),
              clientId: newBot.botUserId,
            };
          } catch { }
          resolve();
        });
        client.login(token).catch(reject);
      });
    }

    /**
     * Sends a message to a Discord channel using the specified bot instance
     * @param channelId The target channel ID
     * @param text The message text to send
     * @param senderName Optional bot instance name (e.g. "Bot #2")
     * @param threadId Optional thread ID if sending to a thread
     * @returns The message ID or empty string on failure
     * @throws Error if no bots are available
     */

    /**
     * Triggers a typing indicator in the channel.
     * Useful for long-running operations like LLM inference.
     */
    public async sendTyping(
      channelId: string,
      senderName?: string,
      threadId?: string
    ): Promise<void> {
      try {
        const isSnowflake = (v: unknown) => /^\d{15,25}$/.test(String(v || ''));
        const botInfo =
          (senderName && isSnowflake(senderName)
            ? this.bots.find(
              (b) =>
                b.botUserId === senderName ||
                b.config?.BOT_ID === senderName ||
                b.config?.discord?.clientId === senderName
            )
            : this.bots.find(
              (b) => b.botUserName === senderName || b.config?.name === senderName
            )) || this.bots[0];

        log(
          `sendTyping: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`
        );

        if (threadId) {
          const thread = await botInfo.client.channels.fetch(threadId);
          if (thread && (thread as any).isTextBased?.()) {
            await (thread as any).sendTyping();
          }
          return;
        }

        const channel = await botInfo.client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          await (channel as TextChannel | NewsChannel).sendTyping();
        }
      } catch (e) {
        log(`Error sending typing indicator to ${channelId}: ${e}`);
      }
    }

    public async sendMessageToChannel(
      channelId: string,
      text: string,
      senderName?: string,
      threadId?: string,
      replyToMessageId?: string
    ): Promise<string> {
      // Input validation for security
      if (!channelId || typeof channelId !== 'string') {
        throw new ValidationError('Invalid channelId provided', 'DISCORD_INVALID_CHANNEL_ID');
      }

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        // Empty messages are rejected by Discord
        log(`Attempted to send empty message to ${channelId}`);
        return '';
      }

      // Sanitize malicious content patterns (basic XSS/Injection prevention)
      const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
          throw new ValidationError(
            'Message contains potentially malicious content',
            'DISCORD_MALICIOUS_CONTENT'
          );
        }
      }

      if (this.bots.length === 0) {
        throw new ConfigurationError(
          'No Discord bot instances available',
          'DISCORD_NO_BOTS_AVAILABLE'
        );
      }

      // Rate limiting check - delay instead of error
      const rateLimitResult = this.checkRateLimitWithDelay(channelId);
      if (rateLimitResult.shouldWait) {
        log(`Rate limit: waiting ${rateLimitResult.waitMs}ms before sending to ${channelId}`);
        await new Promise((resolve) => setTimeout(resolve, rateLimitResult.waitMs));
      }

      const isSnowflake = (v: unknown) => /^\d{15,25}$/.test(String(v || ''));
      const botInfo =
        (senderName && isSnowflake(senderName)
          ? this.bots.find(
            (b) =>
              b.botUserId === senderName ||
              b.config?.BOT_ID === senderName ||
              b.config?.discord?.clientId === senderName
          )
          : this.bots.find((b) => b.botUserName === senderName || b.config?.name === senderName)) ||
        this.bots[0];
      const effectiveSenderName = botInfo.botUserName;

      log(
        `sendMessageToChannel: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`
      );

      // Feature-flagged channel routing: select best channel among candidates
      let selectedChannelId = channelId;
      try {
        // Use string key to avoid TypeScript Path typing issues; messageConfig supports runtime keys
        const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (enabled) {
          const defaultChannel = this.getDefaultChannel();
          const candidates = Array.from(
            new Set([channelId, defaultChannel].filter(Boolean))
          ) as string[];
          if (candidates.length > 0) {
            const picked = pickBestChannel(candidates, {
              provider: 'discord',
              botName: botInfo.botUserName,
            });
            if (picked) {
              selectedChannelId = picked;
              log(
                `ChannelRouter enabled: candidates=${JSON.stringify(candidates)} selected=${selectedChannelId}`
              );
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
        log(`Sending to channel ${selectedChannelId} as ${effectiveSenderName}`);
        const channel = await botInfo.client.channels.fetch(selectedChannelId);
        if (!channel || !channel.isTextBased()) {
          throw new ValidationError(
            `Channel ${selectedChannelId} is not text-based or was not found`,
            'DISCORD_INVALID_CHANNEL'
          );
        }

        // Removed legacy typing delay logic to allow messageHandler to control pacing.

        let message;

        // Prepare message payload
        const payload: any = { content: text };
        if (replyToMessageId) {
          payload.reply = { messageReference: replyToMessageId, failIfNotExists: false };
        }

        if (threadId) {
          const thread = await botInfo.client.channels.fetch(threadId);
          if (!thread || !thread.isThread()) {
            throw new ValidationError(
              `Thread ${threadId} is not a valid thread or was not found`,
              'DISCORD_INVALID_THREAD'
            );
          }
          message = await thread.send(payload);
        } else {
          log(
            `Attempting send to channel ${selectedChannelId}: *${effectiveSenderName}*: ${text} ${replyToMessageId ? `(replying to ${replyToMessageId})` : ''}`
          );
          message = await (channel as TextChannel | NewsChannel | ThreadChannel).send(payload);
        }

        log(
          `Sent message ${message.id} to channel ${selectedChannelId}${threadId ? `/${threadId}` : ''}`
        );
        // Emit outgoing message flow event
        try {
          WebSocketService.getInstance().recordMessageFlow({
            botName: botInfo.botUserName,
            provider: 'discord',
            channelId: selectedChannelId,
            userId: '',
            messageType: 'outgoing',
            contentLength: (text || '').length,
            status: 'success',
          });
        } catch { }
        return message.id;
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          log(
            `Validation error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${error.message}`
          );
          console.error(`[${effectiveSenderName}] Discord send message validation error:`, error);
          try {
            WebSocketService.getInstance().recordAlert({
              level: 'error',
              title: 'Discord sendMessage validation failed',
              message: error.message,
              botName: botInfo.botUserName,
              metadata: { channelId: selectedChannelId, errorType: 'ValidationError' },
            });
          } catch { }
          return '';
        }

        const networkError = new NetworkError(
          `Failed to send message to channel ${selectedChannelId}: ${error instanceof Error ? error.message : String(error)}`,
          { status: 500, data: 'DISCORD_SEND_MESSAGE_ERROR' } as any,
          { url: selectedChannelId, originalError: error } as any
        );

        log(
          `Network error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${networkError.message}`
        );
        console.error(`[${effectiveSenderName}] Discord send message network error:`, networkError);
        try {
          WebSocketService.getInstance().recordAlert({
            level: 'error',
            title: 'Discord sendMessage failed',
            message: networkError.message,
            botName: botInfo.botUserName,
            metadata: { channelId: selectedChannelId, errorType: 'NetworkError' },
          });
        } catch { }
        return '';
      }
    }

    public async sendMessage(
      channelId: string,
      text: string,
      senderName?: string
    ): Promise<string> {
      return this.sendMessageToChannel(channelId, text, senderName);
    }

    public async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> {
      const rawMessages = await this.fetchMessages(channelId, limit);
      // Enforce global cap from config to satisfy tests expecting hard cap
      const cap = (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
      const effective = typeof limit === 'number' && limit > 0 ? Math.min(limit, cap) : cap;
      const limited = rawMessages.slice(0, effective);
      return limited.map((msg) => new DiscordMessage(msg));
    }

    public async getMessages(channelId: string, limit?: number): Promise<IMessage[]> {
      return this.getMessagesFromChannel(channelId, limit);
    }

    public async fetchMessages(channelId: string, limitOverride?: number): Promise<Message[]> {
      const botInfo = this.bots[0];
      try {
        const channel = await botInfo.client.channels.fetch(channelId);
        if (
          !channel ||
          (typeof (channel as any).isTextBased === 'function' && !(channel as any).isTextBased())
        ) {
          throw new Error('Channel is not text-based or was not found');
        }
        const cap =
          (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
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
        console.error('Discord fetch messages network error:', networkError);

        // Record alert if needed
        try {
          WebSocketService.getInstance().recordAlert({
            level: 'error',
            title: 'Discord fetch messages failed',
            message: networkError.message,
            botName: botInfo.botUserName,
            metadata: { channelId, errorType: 'NetworkError' },
          });
        } catch { }

        return [];
      }
    }

    /**
     * Gets the topic/description of a Discord channel.
     * @param channelId The channel to get the topic from
     * @returns The channel topic or null if not available
     */
    public async getChannelTopic(channelId: string): Promise<string | null> {
      try {
        const botInfo = this.bots[0];
        if (!botInfo) {
          return null;
        }
        const channel = await botInfo.client.channels.fetch(channelId);
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
        const botInfo = this.bots[0];
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
      const botInfo = this.bots[0];
      const text = `**Announcement**: ${announcement}`;
      await this.sendMessageToChannel(channelId, text, botInfo.botUserName, threadId);
    }

    public getClientId(): string {
      return this.bots[0].botUserId || '';
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

      return (this.bots || []).map((b) => {
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
          ? this.bots.find(
            (b) =>
              b.botUserId === cfgId ||
              b.config?.BOT_ID === cfgId ||
              b.config?.discord?.clientId === cfgId
          )
          : undefined;

        const byInstanceName = agentInstanceName ? this.getBotByName(agentInstanceName) : undefined;
        const byDisplayName = agentDisplayName ? this.getBotByName(agentDisplayName) : undefined;
        const bot = byId || byInstanceName || byDisplayName;

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
      const channelId =
        (discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';
      this.configCache.set(cacheKey, channelId);
      this.lastConfigCheck = now;

      return channelId;
    }

    /**
     * Updates the bot's presence/activity status with the current model ID.
     * This shows as "Playing <modelId>" in Discord.
     *
     * @param modelId - The model identifier to display
     * @param senderKey - Optional sender key to identify which bot instance to update
     */
    public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
      try {
        // Find the bot to update
        let bot: Bot | undefined;
        if (senderKey) {
          bot = this.bots.find(
            (b) =>
              b.botUserName === senderKey ||
              b.botUserId === senderKey ||
              b.config?.name === senderKey
          );
        }
        if (!bot && this.bots.length > 0) {
          bot = this.bots[0]; // Default to first bot
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
      for (const bot of this.bots) {
        await bot.client.destroy();
        log(`Bot ${bot.botUserName} shut down`);
      }
      Discord.DiscordService.instance = undefined;
    }

    /**
     * Disconnect a specific bot by name
     * @param botName The name of the bot to disconnect
     * @returns true if bot was found and disconnected, false otherwise
     */
    public async disconnectBot(botName: string): Promise<boolean> {
      const botIndex = this.bots.findIndex(
        (b) => b.botUserName === botName || b.config?.name === botName
      );

      if (botIndex === -1) {
        log(`disconnectBot: Bot "${botName}" not found`);
        return false;
      }

      const bot = this.bots[botIndex];
      try {
        await bot.client.destroy();
        log(`Disconnected bot: ${bot.botUserName}`);

        // Remove from active bots array
        this.bots.splice(botIndex, 1);

        return true;
      } catch (error: any) {
        log(`Error disconnecting bot ${botName}: ${error?.message || error}`);
        return false;
      }
    }

    /**
     * Check if a bot is currently connected
     * @param botName The name of the bot to check
     * @returns true if bot is connected, false otherwise
     */
    public isBotConnected(botName: string): boolean {
      const bot = this.bots.find((b) => b.botUserName === botName || b.config?.name === botName);
      if (!bot) return false;

      // Check WebSocket status - 0 = READY
      return bot.client.ws.status === 0;
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
          status:
            ['READY', 'CONNECTING', 'RECONNECTING', 'IDLE', 'NEARLY', 'DISCONNECTED'][status] ||
            'UNKNOWN',
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
        if (!enabled) {
          return 0;
        }
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
      const validTimestamps = timestamps.filter((ts) => now - ts < this.RATE_LIMIT_WINDOW);
      this.messageRateLimit.set(channelKey, validTimestamps);

      // Check if under limit
      if (validTimestamps.length >= this.RATE_LIMIT_MAX) {
        return false;
      }

      // Add current timestamp
      validTimestamps.push(now);
      return true;
    }

    /**
     * Enhanced rate limit check that returns wait time instead of just boolean
     * @param channelId The channel ID to check
     * @returns Object with shouldWait boolean and waitMs milliseconds to wait
     */
    private checkRateLimitWithDelay(channelId: string): { shouldWait: boolean; waitMs: number } {
      const now = Date.now();
      const channelKey = `channel_${channelId}`;

      if (!this.messageRateLimit.has(channelKey)) {
        this.messageRateLimit.set(channelKey, []);
      }

      const timestamps = this.messageRateLimit.get(channelKey)!;

      // Remove timestamps outside the window
      const validTimestamps = timestamps.filter((ts) => now - ts < this.RATE_LIMIT_WINDOW);
      this.messageRateLimit.set(channelKey, validTimestamps);

      // Check if under limit
      if (validTimestamps.length >= this.RATE_LIMIT_MAX) {
        // Calculate how long to wait until oldest timestamp expires
        const oldestTimestamp = Math.min(...validTimestamps);
        const waitMs = this.RATE_LIMIT_WINDOW - (now - oldestTimestamp) + 1000; // +1s buffer
        return { shouldWait: true, waitMs: Math.max(1000, waitMs) };
      }

      // Add current timestamp
      validTimestamps.push(now);
      return { shouldWait: false, waitMs: 0 };
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
        throw new ConfigurationError(
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

    /**
     * Returns individual service wrappers for each managed Discord bot.
     * This allows consumers to interact with specific bots without knowing about the multi-bot implementation.
     */
    public getDelegatedServices(): Array<{
      serviceName: string;
      messengerService: IMessengerService;
      botConfig: any;
    }> {
      return this.bots.map((bot, index) => {
        const botServiceName = `discord-${bot.botUserName || `bot${index + 1}`}`;

        // Create a lightweight wrapper that binds methods to this specific bot
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
            // Force the specific bot's identity
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

          setMessageHandler: (handler) => {
            // Setup a specific handler?
            // Currently DiscordService has one global handler.
            // This method might be a no-op if handlers are global, or we could support per-bot handlers later.
          },

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
  },
};

export const DiscordService = Discord.DiscordService;
export type DiscordService = InstanceType<typeof Discord.DiscordService>;
// This line is removed to break a circular dependency.
// The service is already exported as the default export of this module.
// // These lines are removed to break a circular dependency.
// The service is already exported as the default export of this module.
// export { DiscordService } from './DiscordService';
// export const DiscordService = Discord.DiscordService;
