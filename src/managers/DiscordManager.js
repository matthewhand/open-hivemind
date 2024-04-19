const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');

/**
 * Manages interactions with the Discord API, facilitating message handling, channel operations, and event responses.
 * Utilizes a singleton pattern to ensure only one instance is used throughout the application.
 */
class DiscordManager {
    static instance;
    client;
    typingTimestamps = new Map(); // Maps channel IDs to the last typing timestamp

    /**
     * Constructs the DiscordManager instance, setting up the client with necessary intents.
     */
    constructor() {
        if (DiscordManager.instance) {
            return DiscordManager.instance;
        }
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.initialize();
        DiscordManager.instance = this;

        this.messageTimestamps = new Map();
    }

    /**
     * Initializes the Discord client and sets up event handlers for the bot.
     */
    initialize() {
        this.client.once('ready', () => {
            logger.info(`Bot connected as ${this.client.user.tag}`);
            this.setupEventHandlers();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => {
                logger.error('Error logging into Discord:', error);
                process.exit(1);
            });
        }
    }

    /**
     * Configures event listeners for typing events and message creation, handling them appropriately.
     */
    setupEventHandlers() {
        this.client.on('typingStart', (channel) => {
            this.typingTimestamps.set(channel.id, Date.now());
        });

        this.client.on('messageCreate', async (discordMessage) => {
            try {
                const processedMessage = new DiscordMessage(discordMessage);

                // Debug: Log the entire message object to check all properties
                logger.debug(`[DiscordManager] Received message object: ${JSON.stringify(discordMessage)}`);

                if (!processedMessage.getMessageId() || !processedMessage.content) {
                    logger.error(`[DiscordManager] Invalid or incomplete message received: ID: ${processedMessage.getMessageId()}, Content: ${processedMessage.content}`);
                    return; // Exit if message is incomplete to prevent errors downstream
                }

                logger.debug(`[DiscordManager] Processed message ID: ${processedMessage.getMessageId()}`);

                // Directly utilize fetchChannel and fetchMessages from discordUtils to get channel context
                const channel = await discordUtils.fetchChannel(this.client, processedMessage.getChannelId());
                const historyMessages = await this.fetchMessages(processedMessage.getChannelId());

                if (channel && historyMessages) {
                    // Optionally perform further operations with the fetched channel and messages
                    logger.info(`Channel topic: ${channel.topic || "No topic"}. History messages count: ${historyMessages.length}`);
                }

                if (this.messageHandler) {
                    await this.messageHandler(processedMessage, historyMessages, channel);
                }
            } catch (error) {
                logger.error(`[DiscordManager] Error processing message: ${error}`, { errorDetail: error });
            }
        });
    }

    /**
     * Sets a callback function to handle incoming Discord messages.
     * @param {Function} messageHandlerCallback - The function to be called with the message data.
     */
    setMessageHandler(messageHandlerCallback) {
        if (typeof messageHandlerCallback !== 'function') {
            throw new Error("messageHandlerCallback must be a function");
        }
        this.messageHandler = messageHandlerCallback;
    }

    /**
     * Fetches a specified number of messages from a given channel using utility functions from discordUtils.
     * @param {string} channelId - The ID of the channel to fetch messages from.
     * @returns {Promise<Array<DiscordMessage>>} A promise that resolves to an array of DiscordMessage instances.
     */
    async fetchMessages(channelId) {
        const messages = await discordUtils.fetchMessages(this.client, channelId);
        return messages.reverse(); // So the last message is at the bottom
    }

    /**
     * Sends a response message to a specified channel, splitting it if it exceeds Discord's character limit.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @param {string} messageText - The text of the message to be sent.
     * @returns {Promise<void>}
     */
    async sendResponse(channelId, messageText) {
        this.logMessageTimestamp(channelId);
        await discordUtils.sendResponse(this.client, channelId, messageText);
    }

    /**
     * Retrieves the singleton instance of DiscordManager, creating it if it does not already exist.
     * @returns {DiscordManager} The singleton instance.
     */
    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }
    
    /**
     * Retrieves the last typing timestamp for a specified channel.
     * @param {string} channelId - The ID of the channel to query.
     * @returns {number} The timestamp of the last typing event, or the current time if none is recorded.
     */
    getLastTypingTimestamp(channelId) {
        return this.typingTimestamps.get(channelId) || Date.now();
    }

    getLastMessageTimestamp(channelId) {
        return this.messageTimestamps.get(channelId) || 0; // Retrieve the last message timestamp, or 0 if none exists
    }

    /**
     * Records the timestamp of a sent message.
     * @param {string} channelId - The ID of the channel where the message was sent.
     */
    logMessageTimestamp(channelId) {
        this.messageTimestamps.set(channelId, Date.now());
    }

    /**
     * Signals that the bot is typing in a specific channel. This visual cue can make interactions
     * feel more dynamic and responsive.
     *
     * @param {string} channelId - The ID of the channel where the bot appears to start typing.
     */
    async startTyping(channelId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            // Adjust the check to use the 'type' property for discord.js v12 and above
            if (channel.type === 'GUILD_TEXT' || channel.type === 'DM') {
                await channel.sendTyping();
                logger.debug(`[DiscordManager] Started typing in channel ID: ${channelId}`);
            } else {
                logger.debug(`[DiscordManager] Channel ID: ${channelId} does not support typing.`);
            }
        } catch (error) {
            logger.error(`[DiscordManager] Failed to start typing in channel ID: ${channelId}: ${error}`);
        }
    }
}

module.exports = DiscordManager;
