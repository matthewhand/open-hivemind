"use strict";
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d;
var _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = exports.Discord = void 0;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const discordConfig_1 = __importDefault(require("@config/discordConfig"));
const DiscordMessage_1 = __importDefault(require("./DiscordMessage"));
const BotConfigurationManager_1 = require("@config/BotConfigurationManager");
const UserConfigStore_1 = require("@config/UserConfigStore");
const errorClasses_1 = require("../../../src/types/errorClasses");
const ProviderConfigManager_1 = __importDefault(require("@config/ProviderConfigManager"));
// Optional channel routing feature flag and router
const messageConfig_1 = __importDefault(require("@config/messageConfig"));
// ChannelRouter exports functions, not a class
const ChannelRouter_1 = require("@message/routing/ChannelRouter");
const WebSocketService_1 = __importDefault(require("../../../src/server/services/WebSocketService"));
const specifyHandler_1 = require("./handlers/speckit/specifyHandler");
const events_1 = require("events");
const TypingActivity_1 = __importDefault(require("@message/helpers/processing/TypingActivity"));
// Defensive fallback for environments where GatewayIntentBits may be undefined (e.g., partial mocks)
const SafeGatewayIntentBits = discord_js_1.GatewayIntentBits || {};
const log = (0, debug_1.default)('app:discordService');
exports.Discord = {
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
    DiscordService: (_e = class extends events_1.EventEmitter {
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
            constructor() {
                super();
                this.bots = [];
                this.handlerSet = false;
                this.configCache = new Map();
                this.lastConfigCheck = 0;
                this.CONFIG_CACHE_TTL = 60000; // 1 minute
                this.messageRateLimit = new Map();
                this.RATE_LIMIT_WINDOW = 60000; // 1 minute
                this.RATE_LIMIT_MAX = 3; // 3 messages per minute (lower to prevent runaway bot-to-bot conversations)
                // Channel prioritization parity hooks (gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
                this.supportsChannelPrioritization = true;
                // Initialize is now async/called explicitly, but constructor prepares the bots array.
                // We defer full loading to initialize() or do it here?
                // Constructor used to load legacy sync.
                // We will load synchronously here for compatibility, but using ProviderConfigManager.
                this.loadBotsFromConfig();
            }
            loadBotsFromConfig() {
                const configManager = BotConfigurationManager_1.BotConfigurationManager.getInstance();
                const providerManager = ProviderConfigManager_1.default.getInstance();
                const userConfigStore = UserConfigStore_1.UserConfigStore.getInstance();
                const botConfigs = configManager.getDiscordBotConfigs();
                const providers = providerManager.getAllProviders('message').filter(p => p.type === 'discord' && p.enabled);
                if (providers.length === 0) {
                    // Fallback: Check for legacy DISCORD_BOT_TOKEN environment variable
                    const legacyToken = process.env.DISCORD_BOT_TOKEN;
                    if (legacyToken) {
                        log('Found DISCORD_BOT_TOKEN env var, using as single provider (splitting by comma if multiple)');
                        const tokens = legacyToken.split(',').map(t => t.trim()).filter(Boolean);
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
                    botConfigs.forEach(botConfig => {
                        var _a;
                        // Check if bot is disabled in user config
                        if (userConfigStore.isBotDisabled(botConfig.name)) {
                            log(`Bot ${botConfig.name} is disabled in user config, skipping initialization.`);
                            return;
                        }
                        // Find matching provider by ID, or fallback to first/default
                        let provider = providers.find(p => p.id === botConfig.messageProviderId);
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
                        }
                        else if ((_a = botConfig.discord) === null || _a === void 0 ? void 0 : _a.token) {
                            // Legacy/Manual Mode: Bot config has token directly (e.g. from loadLegacyConfiguration)
                            this.addBotToPool(botConfig.discord.token, botConfig.name, botConfig);
                        }
                        else {
                            log(`Bot ${botConfig.name} has no matching/valid Discord provider. Skipping.`);
                        }
                    });
                }
                else {
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
            addBotToPool(token, name, config) {
                const client = new discord_js_1.Client({ intents: exports.Discord.DiscordService.intents });
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
            static getInstance() {
                if (!exports.Discord.DiscordService.instance) {
                    try {
                        exports.Discord.DiscordService.instance = new exports.Discord.DiscordService();
                    }
                    catch (error) {
                        if (error instanceof errorClasses_1.ValidationError || error instanceof errorClasses_1.ConfigurationError) {
                            console.error('Discord service instance creation error:', error);
                            throw error;
                        }
                        const networkError = new errorClasses_1.NetworkError(`Failed to create DiscordService instance: ${error instanceof Error ? error.message : String(error)}`, { status: 500, data: 'DISCORD_SERVICE_INIT_ERROR' }, { url: 'service-initialization', originalError: error });
                        console.error('Discord service instance creation network error:', networkError);
                        throw networkError;
                    }
                }
                return exports.Discord.DiscordService.instance;
            }
            getAllBots() {
                return this.bots;
            }
            getClient(index = 0) {
                var _a;
                return ((_a = this.bots[index]) === null || _a === void 0 ? void 0 : _a.client) || this.bots[0].client;
            }
            async initialize() {
                // If no bots are configured at all, surface a clear warning and skip.
                if (!this.bots || this.bots.length === 0) {
                    log('DiscordService.initialize(): no Discord bots configured. Skipping Discord initialization.');
                    return;
                }
                // Validate tokens before initializing - log which bots are invalid instead of silently failing.
                const invalidBots = this.bots
                    .map((bot, index) => {
                    var _a;
                    const token = bot.config.token || ((_a = bot.config.discord) === null || _a === void 0 ? void 0 : _a.token);
                    const trimmed = token ? token.trim() : '';
                    return !trimmed
                        ? { index, name: bot.botUserName || bot.config.name || `bot#${index + 1}` }
                        : null;
                })
                    .filter((b) => !!b);
                if (invalidBots.length > 0) {
                    log(`DiscordService.initialize(): found ${invalidBots.length} bot(s) with missing/empty tokens: ` +
                        invalidBots.map(b => b.name).join(', '));
                    throw new errorClasses_1.ValidationError('Cannot initialize DiscordService: One or more bot tokens are empty', 'DISCORD_EMPTY_TOKENS_INIT');
                }
                log(`DiscordService.initialize(): starting login for ${this.bots.length} Discord bot(s).`);
                const loginPromises = this.bots.map((bot) => {
                    return new Promise(async (resolve) => {
                        var _a;
                        bot.client.once('ready', () => {
                            const user = bot.client.user;
                            // Structured debug: confirm Discord identity on startup
                            log(`Discord bot ready: name=${bot.botUserName}, tag=${user === null || user === void 0 ? void 0 : user.tag}, id=${user === null || user === void 0 ? void 0 : user.id}, username=${user === null || user === void 0 ? void 0 : user.username}`);
                            bot.botUserId = (user === null || user === void 0 ? void 0 : user.id) || '';
                            // Persist resolved Discord client id back into the bot config so downstream
                            // reply eligibility (mentions/replies) uses the correct per-instance ID.
                            try {
                                if (!bot.config) {
                                    bot.config = {};
                                }
                                bot.config.BOT_ID = bot.botUserId;
                                bot.config.discord = { ...(bot.config.discord || {}), clientId: bot.botUserId };
                            }
                            catch (_a) { }
                            log(`Initialized ${bot.botUserName} OK`);
                            resolve();
                        });
                        try {
                            const token = (bot.config.token || ((_a = bot.config.discord) === null || _a === void 0 ? void 0 : _a.token) || '').trim();
                            log(`DiscordService.initialize(): initiating login for bot=${bot.botUserName}`);
                            await bot.client.login(token);
                            log(`DiscordService.initialize(): login call completed for bot=${bot.botUserName}`);
                        }
                        catch (err) {
                            log(`DiscordService.initialize(): failed to login bot=${bot.botUserName}: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`);
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
                const ignoreBots = Boolean(messageConfig_1.default.get('MESSAGE_IGNORE_BOTS'));
                const limitToDefault = Boolean(messageConfig_1.default.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL'));
                const allowBotToBot = Boolean(messageConfig_1.default.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
                const onlyWhenSpokenTo = Boolean(messageConfig_1.default.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
                const graceWindowMs = Number(messageConfig_1.default.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || 300000;
                console.info('\n╔══════════════════════════════════════════════════════════════╗');
                console.info('║                 🤖 DISCORD BOT-TO-BOT CONFIG                 ║');
                console.info('╠══════════════════════════════════════════════════════════════╣');
                console.info(`║  MESSAGE_IGNORE_BOTS                    : ${ignoreBots ? '❌ true (BLOCKS ALL)' : '✅ false'}`);
                console.info(`║  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT   : ${limitToDefault ? '⚠️  true' : '✅ false'}`);
                console.info(`║  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED   : ${allowBotToBot ? '✅ true' : '❌ false'}`);
                console.info(`║  MESSAGE_ONLY_WHEN_SPOKEN_TO            : ${onlyWhenSpokenTo ? '⚠️  true' : '✅ false'}`);
                console.info(`║  GRACE_WINDOW_MS                        : ${graceWindowMs}ms (${(graceWindowMs / 60000).toFixed(1)}min)`);
                console.info(`║  DEFAULT_CHANNEL_ID                     : ${defaultChannel || '(not set)'}`);
                console.info('╚══════════════════════════════════════════════════════════════╝\n');
                console.log('!!! EMITTING service-ready FOR DiscordService !!!');
                console.log('!!! DiscordService EMITTER INSTANCE:', this);
                const startupGreetingService = require('@services/StartupGreetingService').default;
                startupGreetingService.emit('service-ready', this);
            }
            setMessageHandler(handler) {
                if (this.handlerSet) {
                    return;
                }
                this.handlerSet = true;
                this.currentHandler = handler;
                this.bots.forEach((bot) => {
                    // Track other users typing (used for pre-typing delay heuristics).
                    bot.client.on('typingStart', (typing) => {
                        var _a;
                        try {
                            const user = typing === null || typing === void 0 ? void 0 : typing.user;
                            const channel = typing === null || typing === void 0 ? void 0 : typing.channel;
                            const channelId = (_a = typing === null || typing === void 0 ? void 0 : typing.channelId) !== null && _a !== void 0 ? _a : channel === null || channel === void 0 ? void 0 : channel.id;
                            if (!channelId || !user) {
                                return;
                            }
                            if (user.bot) {
                                return;
                            }
                            TypingActivity_1.default.getInstance().recordTyping(String(channelId), String(user.id));
                        }
                        catch (_b) { }
                    });
                    bot.client.on('messageCreate', async (message) => {
                        var _a, _b;
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
                            const ignoreBots = Boolean(messageConfig_1.default.get('MESSAGE_IGNORE_BOTS'));
                            if (ignoreBots && message.author.bot) {
                                return;
                            }
                            // Emit incoming message flow event
                            try {
                                WebSocketService_1.default.getInstance().recordMessageFlow({
                                    botName: bot.botUserName,
                                    provider: 'discord',
                                    channelId: message.channelId,
                                    userId: message.author.id,
                                    messageType: 'incoming',
                                    contentLength: (message.content || '').length,
                                    status: 'success',
                                });
                            }
                            catch (_c) { }
                            let repliedMessage = null;
                            try {
                                const refId = (_a = message === null || message === void 0 ? void 0 : message.reference) === null || _a === void 0 ? void 0 : _a.messageId;
                                if (refId && message.channel && ((_b = message.channel.messages) === null || _b === void 0 ? void 0 : _b.fetch)) {
                                    repliedMessage = await message.channel.messages.fetch(refId).catch(() => null);
                                }
                            }
                            catch (_d) {
                                repliedMessage = null;
                            }
                            const wrappedMessage = new DiscordMessage_1.default(message, repliedMessage);
                            const history = await this.getMessagesFromChannel(message.channelId);
                            await handler(wrappedMessage, history, bot.config);
                        }
                        catch (error) {
                            // Log error but don't crash handler loop
                            console.error(`Error in Discord message handler for bot ${bot.botUserName}:`, error);
                            return;
                        }
                    });
                });
            }
            setInteractionHandler() {
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
                            await (0, specifyHandler_1.handleSpeckitSpecify)(interaction);
                        }
                    });
                });
            }
            /**
             * Add a Discord bot instance at runtime (admin-hot-add) using minimal legacy config shape.
             */
            async addBot(botConfig) {
                var _a;
                const token = ((_a = botConfig === null || botConfig === void 0 ? void 0 : botConfig.discord) === null || _a === void 0 ? void 0 : _a.token) || (botConfig === null || botConfig === void 0 ? void 0 : botConfig.token);
                const name = (botConfig === null || botConfig === void 0 ? void 0 : botConfig.name) || `Bot${this.bots.length + 1}`;
                if (!token) {
                    throw new errorClasses_1.ValidationError('Discord addBot requires a token', 'DISCORD_ADDBOT_MISSING_TOKEN');
                }
                const client = new discord_js_1.Client({ intents: exports.Discord.DiscordService.intents });
                const newBot = {
                    client,
                    botUserId: '',
                    botUserName: name,
                    config: {
                        ...botConfig, // Copy all config including system prompts
                        name,
                        token,
                        discord: { ...botConfig === null || botConfig === void 0 ? void 0 : botConfig.discord, token },
                        llmProvider: (botConfig === null || botConfig === void 0 ? void 0 : botConfig.llmProvider) || 'flowise',
                        llm: (botConfig === null || botConfig === void 0 ? void 0 : botConfig.llm) || undefined,
                    },
                };
                this.bots.push(newBot);
                if (this.currentHandler) {
                    // Track other users typing (used for pre-typing delay heuristics).
                    client.on('typingStart', (typing) => {
                        var _a;
                        try {
                            const user = typing === null || typing === void 0 ? void 0 : typing.user;
                            const channel = typing === null || typing === void 0 ? void 0 : typing.channel;
                            const channelId = (_a = typing === null || typing === void 0 ? void 0 : typing.channelId) !== null && _a !== void 0 ? _a : channel === null || channel === void 0 ? void 0 : channel.id;
                            if (!channelId || !user) {
                                return;
                            }
                            if (user.bot) {
                                return;
                            }
                            TypingActivity_1.default.getInstance().recordTyping(String(channelId), String(user.id));
                        }
                        catch (_b) { }
                    });
                    client.on('messageCreate', async (message) => {
                        var _a, _b;
                        try {
                            if (!message || !message.author) {
                                return;
                            }
                            if (!message.channelId) {
                                return;
                            }
                            // Config-based bot message handling (same as main handler)
                            // Logic moved to centralized handler (shouldReplyToMessage)
                            let repliedMessage = null;
                            try {
                                const refId = (_a = message === null || message === void 0 ? void 0 : message.reference) === null || _a === void 0 ? void 0 : _a.messageId;
                                if (refId && message.channel && ((_b = message.channel.messages) === null || _b === void 0 ? void 0 : _b.fetch)) {
                                    repliedMessage = await message.channel.messages.fetch(refId).catch(() => null);
                                }
                            }
                            catch (_c) {
                                repliedMessage = null;
                            }
                            const wrappedMessage = new DiscordMessage_1.default(message, repliedMessage);
                            const history = await this.getMessagesFromChannel(message.channelId);
                            await this.currentHandler(wrappedMessage, history, newBot.config);
                        }
                        catch (_d) {
                            return;
                        }
                    });
                }
                await new Promise((resolve, reject) => {
                    client.once('ready', () => {
                        var _a, _b;
                        log(`Discord ${name} logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
                        newBot.botUserId = ((_b = client.user) === null || _b === void 0 ? void 0 : _b.id) || '';
                        // Persist resolved client id into config for consistent downstream mention detection.
                        try {
                            newBot.config.BOT_ID = newBot.botUserId;
                            newBot.config.discord = { ...(newBot.config.discord || {}), clientId: newBot.botUserId };
                        }
                        catch (_c) { }
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
            async sendTyping(channelId, senderName, threadId) {
                var _a, _b;
                try {
                    const isSnowflake = (v) => /^\d{15,25}$/.test(String(v || ''));
                    const botInfo = (senderName && isSnowflake(senderName)
                        ? this.bots.find((b) => { var _a, _b, _c; return b.botUserId === senderName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.BOT_ID) === senderName || ((_c = (_b = b.config) === null || _b === void 0 ? void 0 : _b.discord) === null || _c === void 0 ? void 0 : _c.clientId) === senderName; })
                        : this.bots.find((b) => { var _a; return b.botUserName === senderName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.name) === senderName; })) || this.bots[0];
                    log(`sendTyping: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`);
                    if (threadId) {
                        const thread = await botInfo.client.channels.fetch(threadId);
                        if (thread && ((_b = (_a = thread).isTextBased) === null || _b === void 0 ? void 0 : _b.call(_a))) {
                            await thread.sendTyping();
                        }
                        return;
                    }
                    const channel = await botInfo.client.channels.fetch(channelId);
                    if (channel && channel.isTextBased()) {
                        await channel.sendTyping();
                    }
                }
                catch (e) {
                    log(`Error sending typing indicator to ${channelId}: ${e}`);
                }
            }
            async sendMessageToChannel(channelId, text, senderName, threadId, replyToMessageId) {
                var _a;
                // Input validation for security
                if (!channelId || typeof channelId !== 'string') {
                    throw new errorClasses_1.ValidationError('Invalid channelId provided', 'DISCORD_INVALID_CHANNEL_ID');
                }
                if (!text || typeof text !== 'string' || text.trim().length === 0) {
                    // Empty messages are rejected by Discord
                    log(`Attempted to send empty message to ${channelId}`);
                    return '';
                }
                // Sanitize malicious content patterns (basic XSS/Injection prevention)
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /on\w+\s*=/i,
                    /<iframe/i,
                    /<object/i,
                ];
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(text)) {
                        throw new errorClasses_1.ValidationError('Message contains potentially malicious content', 'DISCORD_MALICIOUS_CONTENT');
                    }
                }
                if (this.bots.length === 0) {
                    throw new errorClasses_1.ConfigurationError('No Discord bot instances available', 'DISCORD_NO_BOTS_AVAILABLE');
                }
                // Rate limiting check - delay instead of error
                const rateLimitResult = this.checkRateLimitWithDelay(channelId);
                if (rateLimitResult.shouldWait) {
                    log(`Rate limit: waiting ${rateLimitResult.waitMs}ms before sending to ${channelId}`);
                    await new Promise(resolve => setTimeout(resolve, rateLimitResult.waitMs));
                }
                const isSnowflake = (v) => /^\d{15,25}$/.test(String(v || ''));
                const botInfo = (senderName && isSnowflake(senderName)
                    ? this.bots.find((b) => { var _a, _b, _c; return b.botUserId === senderName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.BOT_ID) === senderName || ((_c = (_b = b.config) === null || _b === void 0 ? void 0 : _b.discord) === null || _c === void 0 ? void 0 : _c.clientId) === senderName; })
                    : this.bots.find((b) => { var _a; return b.botUserName === senderName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.name) === senderName; })) || this.bots[0];
                const effectiveSenderName = botInfo.botUserName;
                log(`sendMessageToChannel: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`);
                // Feature-flagged channel routing: select best channel among candidates
                let selectedChannelId = channelId;
                try {
                    // Use string key to avoid TypeScript Path typing issues; messageConfig supports runtime keys
                    const enabled = Boolean(messageConfig_1.default.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
                    if (enabled) {
                        const defaultChannel = this.getDefaultChannel();
                        const candidates = Array.from(new Set([channelId, defaultChannel].filter(Boolean)));
                        if (candidates.length > 0) {
                            const picked = (0, ChannelRouter_1.pickBestChannel)(candidates, {
                                provider: 'discord',
                                botName: botInfo.botUserName,
                            });
                            if (picked) {
                                selectedChannelId = picked;
                                log(`ChannelRouter enabled: candidates=${JSON.stringify(candidates)} selected=${selectedChannelId}`);
                            }
                            else {
                                log(`ChannelRouter returned null; falling back to provided channelId=${channelId}`);
                            }
                        }
                    }
                }
                catch (err) {
                    // Fail open to original behavior on any config/routing issues
                    log(`ChannelRouter disabled due to error or misconfig: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err}`);
                    selectedChannelId = channelId;
                }
                try {
                    log(`Sending to channel ${selectedChannelId} as ${effectiveSenderName}`);
                    const channel = await botInfo.client.channels.fetch(selectedChannelId);
                    if (!channel || !channel.isTextBased()) {
                        throw new errorClasses_1.ValidationError(`Channel ${selectedChannelId} is not text-based or was not found`, 'DISCORD_INVALID_CHANNEL');
                    }
                    // Removed legacy typing delay logic to allow messageHandler to control pacing.
                    let message;
                    // Prepare message payload
                    const payload = { content: text };
                    if (replyToMessageId) {
                        payload.reply = { messageReference: replyToMessageId, failIfNotExists: false };
                    }
                    if (threadId) {
                        const thread = await botInfo.client.channels.fetch(threadId);
                        if (!thread || !thread.isThread()) {
                            throw new errorClasses_1.ValidationError(`Thread ${threadId} is not a valid thread or was not found`, 'DISCORD_INVALID_THREAD');
                        }
                        message = await thread.send(payload);
                    }
                    else {
                        log(`Attempting send to channel ${selectedChannelId}: *${effectiveSenderName}*: ${text} ${replyToMessageId ? `(replying to ${replyToMessageId})` : ''}`);
                        message = await channel.send(payload);
                    }
                    log(`Sent message ${message.id} to channel ${selectedChannelId}${threadId ? `/${threadId}` : ''}`);
                    // Emit outgoing message flow event
                    try {
                        WebSocketService_1.default.getInstance().recordMessageFlow({
                            botName: botInfo.botUserName,
                            provider: 'discord',
                            channelId: selectedChannelId,
                            userId: '',
                            messageType: 'outgoing',
                            contentLength: (text || '').length,
                            status: 'success',
                        });
                    }
                    catch (_b) { }
                    return message.id;
                }
                catch (error) {
                    if (error instanceof errorClasses_1.ValidationError) {
                        log(`Validation error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${error.message}`);
                        console.error(`[${effectiveSenderName}] Discord send message validation error:`, error);
                        try {
                            WebSocketService_1.default.getInstance().recordAlert({
                                level: 'error',
                                title: 'Discord sendMessage validation failed',
                                message: error.message,
                                botName: botInfo.botUserName,
                                metadata: { channelId: selectedChannelId, errorType: 'ValidationError' },
                            });
                        }
                        catch (_c) { }
                        return '';
                    }
                    const networkError = new errorClasses_1.NetworkError(`Failed to send message to channel ${selectedChannelId}: ${error instanceof Error ? error.message : String(error)}`, { status: 500, data: 'DISCORD_SEND_MESSAGE_ERROR' }, { url: selectedChannelId, originalError: error });
                    log(`Network error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${networkError.message}`);
                    console.error(`[${effectiveSenderName}] Discord send message network error:`, networkError);
                    try {
                        WebSocketService_1.default.getInstance().recordAlert({
                            level: 'error',
                            title: 'Discord sendMessage failed',
                            message: networkError.message,
                            botName: botInfo.botUserName,
                            metadata: { channelId: selectedChannelId, errorType: 'NetworkError' },
                        });
                    }
                    catch (_d) { }
                    return '';
                }
            }
            async sendMessage(channelId, text, senderName) {
                return this.sendMessageToChannel(channelId, text, senderName);
            }
            async getMessagesFromChannel(channelId, limit) {
                const rawMessages = await this.fetchMessages(channelId, limit);
                // Enforce global cap from config to satisfy tests expecting hard cap
                const cap = discordConfig_1.default.get('DISCORD_MESSAGE_HISTORY_LIMIT') || 10;
                const effective = typeof limit === 'number' && limit > 0 ? Math.min(limit, cap) : cap;
                const limited = rawMessages.slice(0, effective);
                return limited.map(msg => new DiscordMessage_1.default(msg));
            }
            async getMessages(channelId, limit) {
                return this.getMessagesFromChannel(channelId, limit);
            }
            async fetchMessages(channelId, limitOverride) {
                const botInfo = this.bots[0];
                try {
                    const channel = await botInfo.client.channels.fetch(channelId);
                    if (!channel || (typeof channel.isTextBased === 'function' && !channel.isTextBased())) {
                        throw new Error('Channel is not text-based or was not found');
                    }
                    const cap = discordConfig_1.default.get('DISCORD_MESSAGE_HISTORY_LIMIT') || 10;
                    const limit = typeof limitOverride === 'number' && limitOverride > 0 ? Math.min(limitOverride, cap) : cap;
                    const messages = await channel.messages.fetch({ limit });
                    const arr = Array.from(messages.values());
                    // Enforce hard cap and reverse to oldest-first order (Discord returns newest-first)
                    return arr.slice(0, limit).reverse();
                }
                catch (error) {
                    const networkError = new errorClasses_1.NetworkError(`Failed to fetch messages from ${channelId}: ${error instanceof Error ? error.message : String(error)}`, { status: 500, data: 'DISCORD_FETCH_MESSAGES_ERROR' }, { url: channelId, originalError: error });
                    log(`Network error fetching messages from ${channelId}: ${networkError.message}`);
                    console.error('Discord fetch messages network error:', networkError);
                    // Record alert if needed
                    try {
                        WebSocketService_1.default.getInstance().recordAlert({
                            level: 'error',
                            title: 'Discord fetch messages failed',
                            message: networkError.message,
                            botName: botInfo.botUserName,
                            metadata: { channelId, errorType: 'NetworkError' },
                        });
                    }
                    catch (_a) { }
                    return [];
                }
            }
            /**
             * Gets the topic/description of a Discord channel.
             * @param channelId The channel to get the topic from
             * @returns The channel topic or null if not available
             */
            async getChannelTopic(channelId) {
                try {
                    const botInfo = this.bots[0];
                    if (!botInfo) {
                        return null;
                    }
                    const channel = await botInfo.client.channels.fetch(channelId);
                    if (channel && 'topic' in channel && typeof channel.topic === 'string') {
                        return channel.topic || null;
                    }
                    return null;
                }
                catch (error) {
                    log(`Error fetching channel topic for ${channelId}: ${error}`);
                    return null;
                }
            }
            async sendPublicAnnouncement(channelId, announcement, threadId) {
                const botInfo = this.bots[0];
                const text = `**Announcement**: ${announcement}`;
                await this.sendMessageToChannel(channelId, text, botInfo.botUserName, threadId);
            }
            getClientId() {
                return this.bots[0].botUserId || '';
            }
            getAgentStartupSummaries() {
                const safePrompt = (cfg) => {
                    var _a, _b, _c, _d, _f, _g, _h;
                    const p = (_h = (_f = (_d = (_c = (_a = cfg === null || cfg === void 0 ? void 0 : cfg.OPENAI_SYSTEM_PROMPT) !== null && _a !== void 0 ? _a : (_b = cfg === null || cfg === void 0 ? void 0 : cfg.openai) === null || _b === void 0 ? void 0 : _b.systemPrompt) !== null && _c !== void 0 ? _c : cfg === null || cfg === void 0 ? void 0 : cfg.SYSTEM_INSTRUCTION) !== null && _d !== void 0 ? _d : cfg === null || cfg === void 0 ? void 0 : cfg.systemInstruction) !== null && _f !== void 0 ? _f : (_g = cfg === null || cfg === void 0 ? void 0 : cfg.llm) === null || _g === void 0 ? void 0 : _g.systemPrompt) !== null && _h !== void 0 ? _h : '';
                    return typeof p === 'string' ? p : String(p || '');
                };
                const safeLlm = (cfg) => {
                    var _a, _b, _c, _d, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
                    const llmProvider = (_d = (_b = (_a = cfg === null || cfg === void 0 ? void 0 : cfg.LLM_PROVIDER) !== null && _a !== void 0 ? _a : cfg === null || cfg === void 0 ? void 0 : cfg.llmProvider) !== null && _b !== void 0 ? _b : (_c = cfg === null || cfg === void 0 ? void 0 : cfg.llm) === null || _c === void 0 ? void 0 : _c.provider) !== null && _d !== void 0 ? _d : undefined;
                    const llmModel = (_k = (_h = (_f = cfg === null || cfg === void 0 ? void 0 : cfg.OPENAI_MODEL) !== null && _f !== void 0 ? _f : (_g = cfg === null || cfg === void 0 ? void 0 : cfg.openai) === null || _g === void 0 ? void 0 : _g.model) !== null && _h !== void 0 ? _h : (_j = cfg === null || cfg === void 0 ? void 0 : cfg.llm) === null || _j === void 0 ? void 0 : _j.model) !== null && _k !== void 0 ? _k : undefined;
                    const llmEndpoint = (_t = (_r = (_q = (_o = (_l = cfg === null || cfg === void 0 ? void 0 : cfg.OPENAI_BASE_URL) !== null && _l !== void 0 ? _l : (_m = cfg === null || cfg === void 0 ? void 0 : cfg.openai) === null || _m === void 0 ? void 0 : _m.baseUrl) !== null && _o !== void 0 ? _o : (_p = cfg === null || cfg === void 0 ? void 0 : cfg.openwebui) === null || _p === void 0 ? void 0 : _p.apiUrl) !== null && _q !== void 0 ? _q : cfg === null || cfg === void 0 ? void 0 : cfg.OPENSWARM_BASE_URL) !== null && _r !== void 0 ? _r : (_s = cfg === null || cfg === void 0 ? void 0 : cfg.openswarm) === null || _s === void 0 ? void 0 : _s.baseUrl) !== null && _t !== void 0 ? _t : undefined;
                    return {
                        llmProvider: llmProvider ? String(llmProvider) : undefined,
                        llmModel: llmModel ? String(llmModel) : undefined,
                        llmEndpoint: llmEndpoint ? String(llmEndpoint) : undefined,
                    };
                };
                return (this.bots || []).map((b) => {
                    const cfg = (b === null || b === void 0 ? void 0 : b.config) || {};
                    const { llmProvider, llmModel, llmEndpoint } = safeLlm(cfg);
                    return {
                        name: String((b === null || b === void 0 ? void 0 : b.botUserName) || (cfg === null || cfg === void 0 ? void 0 : cfg.name) || 'DiscordBot'),
                        provider: 'discord',
                        botId: (b === null || b === void 0 ? void 0 : b.botUserId) ? String(b.botUserId) : undefined,
                        messageProvider: 'discord',
                        llmProvider,
                        llmModel,
                        llmEndpoint,
                        systemPrompt: safePrompt(cfg),
                    };
                });
            }
            resolveAgentContext(params) {
                var _a, _b, _c, _d, _f;
                try {
                    const botConfig = (params === null || params === void 0 ? void 0 : params.botConfig) || {};
                    const agentDisplayName = String((params === null || params === void 0 ? void 0 : params.agentDisplayName) || '').trim();
                    const agentInstanceName = String((botConfig === null || botConfig === void 0 ? void 0 : botConfig.name) || '').trim();
                    const isSnowflake = (v) => /^\d{15,25}$/.test(String(v || ''));
                    const cfgId = isSnowflake(botConfig === null || botConfig === void 0 ? void 0 : botConfig.BOT_ID)
                        ? String(botConfig.BOT_ID)
                        : (isSnowflake((_a = botConfig === null || botConfig === void 0 ? void 0 : botConfig.discord) === null || _a === void 0 ? void 0 : _a.clientId) ? String(botConfig.discord.clientId) : '');
                    const byId = cfgId
                        ? this.bots.find((b) => {
                            var _a, _b, _c;
                            return b.botUserId === cfgId ||
                                ((_a = b.config) === null || _a === void 0 ? void 0 : _a.BOT_ID) === cfgId ||
                                ((_c = (_b = b.config) === null || _b === void 0 ? void 0 : _b.discord) === null || _c === void 0 ? void 0 : _c.clientId) === cfgId;
                        })
                        : undefined;
                    const byInstanceName = agentInstanceName ? this.getBotByName(agentInstanceName) : undefined;
                    const byDisplayName = agentDisplayName ? this.getBotByName(agentDisplayName) : undefined;
                    const bot = byId || byInstanceName || byDisplayName;
                    const botId = String((bot === null || bot === void 0 ? void 0 : bot.botUserId) ||
                        cfgId ||
                        this.getClientId() ||
                        '');
                    // In Discord swarm mode, use the snowflake id as a stable sender key to pick the correct instance.
                    const senderKey = botId || agentInstanceName || agentDisplayName;
                    const nameCandidates = Array.from(new Set([
                        agentDisplayName,
                        agentInstanceName,
                        bot === null || bot === void 0 ? void 0 : bot.botUserName,
                        (_c = (_b = bot === null || bot === void 0 ? void 0 : bot.client) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.username,
                        (_f = (_d = bot === null || bot === void 0 ? void 0 : bot.client) === null || _d === void 0 ? void 0 : _d.user) === null || _f === void 0 ? void 0 : _f.globalName,
                    ]
                        .filter(Boolean)
                        .map((v) => String(v))));
                    return { botId, senderKey, nameCandidates };
                }
                catch (_g) {
                    return null;
                }
            }
            getDefaultChannel() {
                const cacheKey = 'DISCORD_DEFAULT_CHANNEL_ID';
                const now = Date.now();
                // Check cache first
                if (this.configCache.has(cacheKey) &&
                    (now - this.lastConfigCheck) < this.CONFIG_CACHE_TTL) {
                    return this.configCache.get(cacheKey);
                }
                // Update cache
                const channelId = discordConfig_1.default.get('DISCORD_DEFAULT_CHANNEL_ID') || '';
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
            async setModelActivity(modelId, senderKey) {
                var _a;
                try {
                    // Find the bot to update
                    let bot;
                    if (senderKey) {
                        bot = this.bots.find(b => {
                            var _a;
                            return b.botUserName === senderKey ||
                                b.botUserId === senderKey ||
                                ((_a = b.config) === null || _a === void 0 ? void 0 : _a.name) === senderKey;
                        });
                    }
                    if (!bot && this.bots.length > 0) {
                        bot = this.bots[0]; // Default to first bot
                    }
                    if ((_a = bot === null || bot === void 0 ? void 0 : bot.client) === null || _a === void 0 ? void 0 : _a.user) {
                        bot.client.user.setActivity(modelId, { type: 0 }); // 0 = Playing
                        log(`Set presence for ${bot.botUserName}: Playing ${modelId}`);
                    }
                }
                catch (error) {
                    log(`Failed to set model activity: ${error}`);
                }
            }
            async shutdown() {
                for (const bot of this.bots) {
                    await bot.client.destroy();
                    log(`Bot ${bot.botUserName} shut down`);
                }
                exports.Discord.DiscordService.instance = undefined;
            }
            /**
             * Disconnect a specific bot by name
             * @param botName The name of the bot to disconnect
             * @returns true if bot was found and disconnected, false otherwise
             */
            async disconnectBot(botName) {
                const botIndex = this.bots.findIndex((b) => { var _a; return b.botUserName === botName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.name) === botName; });
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
                }
                catch (error) {
                    log(`Error disconnecting bot ${botName}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
                    return false;
                }
            }
            /**
             * Check if a bot is currently connected
             * @param botName The name of the bot to check
             * @returns true if bot is connected, false otherwise
             */
            isBotConnected(botName) {
                const bot = this.bots.find((b) => { var _a; return b.botUserName === botName || ((_a = b.config) === null || _a === void 0 ? void 0 : _a.name) === botName; });
                if (!bot)
                    return false;
                // Check WebSocket status - 0 = READY
                return bot.client.ws.status === 0;
            }
            /**
             * Get health status for all Discord bot instances
             */
            getHealthStatus() {
                const botStatus = {};
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
            scoreChannel(channelId, metadata) {
                try {
                    const enabled = Boolean(messageConfig_1.default.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
                    if (!enabled) {
                        return 0;
                    }
                    return (0, ChannelRouter_1.computeScore)(channelId, metadata);
                }
                catch (e) {
                    log(`scoreChannel error; returning 0: ${e instanceof Error ? e.message : String(e)}`);
                    return 0;
                }
            }
            getBotByName(name) {
                return this.bots.find((bot) => bot.botUserName === name);
            }
            /**
             * Check if the channel is within rate limits
             * @param channelId The channel ID to check
             * @returns true if within limits, false if rate limited
             */
            checkRateLimit(channelId) {
                const now = Date.now();
                const channelKey = `channel_${channelId}`;
                if (!this.messageRateLimit.has(channelKey)) {
                    this.messageRateLimit.set(channelKey, []);
                }
                const timestamps = this.messageRateLimit.get(channelKey);
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
            /**
             * Enhanced rate limit check that returns wait time instead of just boolean
             * @param channelId The channel ID to check
             * @returns Object with shouldWait boolean and waitMs milliseconds to wait
             */
            checkRateLimitWithDelay(channelId) {
                const now = Date.now();
                const channelKey = `channel_${channelId}`;
                if (!this.messageRateLimit.has(channelKey)) {
                    this.messageRateLimit.set(channelKey, []);
                }
                const timestamps = this.messageRateLimit.get(channelKey);
                // Remove timestamps outside the window
                const validTimestamps = timestamps.filter(ts => (now - ts) < this.RATE_LIMIT_WINDOW);
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
            async joinVoiceChannel(channelId) {
                if (!this.voiceManager) {
                    const { VoiceChannelManager } = require('./voice/voiceChannelManager');
                    this.voiceManager = new VoiceChannelManager(this.getClient());
                }
                await this.voiceManager.joinChannel(channelId, true);
                log(`Joined voice channel ${channelId} with full voice capabilities`);
            }
            async leaveVoiceChannel(channelId) {
                if (!this.voiceManager) {
                    throw new errorClasses_1.ConfigurationError('Voice manager not initialized', 'DISCORD_VOICE_MANAGER_NOT_INIT');
                }
                this.voiceManager.leaveChannel(channelId);
                log(`Left voice channel ${channelId}`);
            }
            getVoiceChannels() {
                var _a;
                return ((_a = this.voiceManager) === null || _a === void 0 ? void 0 : _a.getActiveChannels()) || [];
            }
            /**
             * Returns individual service wrappers for each managed Discord bot.
             * This allows consumers to interact with specific bots without knowing about the multi-bot implementation.
             */
            getDelegatedServices() {
                return this.bots.map((bot, index) => {
                    const botServiceName = `discord-${bot.botUserName || `bot${index + 1}`}`;
                    // Create a lightweight wrapper that binds methods to this specific bot
                    const serviceWrapper = {
                        initialize: async () => { },
                        shutdown: async () => { },
                        sendMessageToChannel: async (channelId, message, senderName, threadId, replyToMessageId) => {
                            // Force the specific bot's identity
                            return this.sendMessageToChannel(channelId, message, bot.botUserName, threadId, replyToMessageId);
                        },
                        getMessagesFromChannel: async (channelId) => this.getMessagesFromChannel(channelId),
                        sendPublicAnnouncement: async (channelId, announcement) => this.sendPublicAnnouncement(channelId, announcement),
                        getClientId: () => bot.botUserId,
                        getDefaultChannel: () => this.getDefaultChannel(),
                        setMessageHandler: (handler) => {
                            // Setup a specific handler? 
                            // Currently DiscordService has one global handler. 
                            // This method might be a no-op if handlers are global, or we could support per-bot handlers later.
                        },
                        supportsChannelPrioritization: this.supportsChannelPrioritization,
                        scoreChannel: this.scoreChannel ? (cid, meta) => this.scoreChannel(cid, meta) : undefined,
                    };
                    return {
                        serviceName: botServiceName,
                        messengerService: serviceWrapper,
                        botConfig: bot.config,
                    };
                });
            }
        },
        __setFunctionName(_e, "DiscordService"),
        // Use SafeGatewayIntentBits fallbacks to avoid crashes if discord.js intents are unavailable
        _e.intents = [
            (_a = SafeGatewayIntentBits.Guilds) !== null && _a !== void 0 ? _a : (1 << 0),
            (_b = SafeGatewayIntentBits.GuildMessages) !== null && _b !== void 0 ? _b : (1 << 9),
            (_c = SafeGatewayIntentBits.MessageContent) !== null && _c !== void 0 ? _c : (1 << 15),
            (_d = SafeGatewayIntentBits.GuildVoiceStates) !== null && _d !== void 0 ? _d : (1 << 7),
        ],
        _e),
};
exports.DiscordService = exports.Discord.DiscordService;
// This line is removed to break a circular dependency.
// The service is already exported as the default export of this module.
// // These lines are removed to break a circular dependency.
// The service is already exported as the default export of this module.
// export { DiscordService } from './DiscordService';
// export const DiscordService = Discord.DiscordService;
