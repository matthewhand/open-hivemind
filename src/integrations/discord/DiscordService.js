"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
const discord_js_1 = require("discord.js");
const initializeClient_1 = require("./interaction/initializeClient");
const debug_1 = __importDefault(require("debug"));
const DiscordMessage_1 = __importDefault(require("@src/integrations/discord/DiscordMessage"));
const discordConfig_1 = __importDefault(require("@integrations/discord/interfaces/discordConfig"));
const log = (0, debug_1.default)('app:discord-service');
/**
 * DiscordService Class
 *
 * This service handles interactions with the Discord API, managing message handling,
 * user authentication, and other Discord-related operations. It follows the singleton
 * pattern to ensure that only one instance of the service is used throughout the application.
 *
 * Key Features:
 * - Singleton pattern for centralized management
 * - Handles user authentication and message interactions
 * - Manages Discord client initialization and event handling
 */
class DiscordService {
    // Private constructor to enforce singleton pattern
    constructor() {
        this.messageHandler = null;
        log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
        this.client = (0, initializeClient_1.initializeClient)();
        log('Client initialized successfully');
    }
    /**
     * Retrieves the singleton instance of DiscordService.
     *
     * @returns {DiscordService} The singleton instance of DiscordService.
     */
    static getInstance() {
        if (!DiscordService.instance) {
            log('Creating a new instance of DiscordService');
            DiscordService.instance = new DiscordService();
        }
        return DiscordService.instance;
    }
    /**
     * Sets a custom message handler for incoming messages.
     *
     * @param handler - The message handler to set.
     */
    setMessageHandler(handler) {
        this.messageHandler = handler;
    }
    /**
     * Initializes the Discord client and logs in with the provided token.
     *
     * @param token - The token to use for logging in. If not provided, the token will be retrieved from the configuration.
     */
    initialize(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Retrieve the token from the configuration if not provided
                token = token || discordConfig_1.default.get('DISCORD_BOT_TOKEN');
                if (!token) {
                    throw new Error('DISCORD_BOT_TOKEN is not set');
                }
                yield this.client.login(token);
                this.client.once('ready', () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    log(`Logged in as ${(_a = this.client.user) === null || _a === void 0 ? void 0 : _a.tag}!`);
                    yield this.debugPermissions();
                }));
                if (this.messageHandler) {
                    log('Setting up custom message handler');
                    this.client.on('messageCreate', (message) => {
                        log(`Received a message with ID: ${message.id}`);
                        const iMessage = new DiscordMessage_1.default(message);
                        this.messageHandler(iMessage);
                    });
                }
                else {
                    log('No custom message handler set');
                }
            }
            catch (error) {
                log('Failed to start DiscordService: ' + error.message);
                log(error.stack); // Improvement: Added stack trace logging for better error tracking
                process.exit(1);
            }
        });
    }
    /**
     * Starts the Discord service by initializing and logging in the client.
     *
     * @param token - The token to use for logging in.
     */
    start(token) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initialize(token);
        });
    }
    /**
     * Sends a message to a specified Discord channel.
     *
     * @param channelId - The ID of the channel to send the message to.
     * @param message - The message content to send.
     */
    sendMessageToChannel(channelId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const channel = this.client.channels.cache.get(channelId);
                if (!channel) {
                    throw new Error('Channel not found');
                }
                log(`Sending message to channel ${channelId}: ${message}`);
                yield channel.send(message);
                log(`Message sent to channel ${channelId} successfully`);
            }
            catch (error) {
                log(`Failed to send message to channel ${channelId}: ` + error.message);
                log(error.stack); // Improvement: Added stack trace logging for better error debugging
                throw error;
            }
        });
    }
    /**
     * Debugs and logs the bot's permissions in each guild it is part of.
     */
    debugPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            this.client.guilds.cache.forEach(guild => {
                var _a;
                const botMember = guild.members.cache.get((_a = this.client.user) === null || _a === void 0 ? void 0 : _a.id);
                if (!botMember) {
                    log(`Bot not found in guild: ${guild.name}`);
                    return;
                }
                const permissions = botMember.permissions;
                const requiredPermissions = [
                    discord_js_1.PermissionsBitField.Flags.SendMessages,
                    discord_js_1.PermissionsBitField.Flags.ViewChannel,
                    discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
                ];
                requiredPermissions.forEach(permission => {
                    if (!permissions.has(permission)) {
                        log(`Bot lacks permission ${permission.toString()} in guild: ${guild.name}`);
                    }
                });
                log(`Permissions in guild "${guild.name}":`, permissions.toArray().map(perm => perm.toString()));
            });
        });
    }
}
exports.DiscordService = DiscordService;
