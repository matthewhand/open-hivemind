const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');


/**
 * Manages interactions with the Discord API. It handles sending messages, fetching messages,
 * indicating typing, and maintaining a record of the last message time for each channel.
 */
class DiscordManager {
    static instance;
    client;
    lastMessageTimestamps = {};

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
    }

    /**
     * Initializes the Discord client and sets up event handlers for the bot.
     */
    initialize() {
        this.client.login(process.env.DISCORD_TOKEN).catch(error => {
            logger.error('Failed to login to Discord:', error);
            process.exit(1);
        });

        this.client.once('ready', () => {
            logger.info(`Bot connected as ${this.client.user.tag}`);
            this.setupEventHandlers();
        });
    }

    setupEventHandlers() {
        this.client.on('typingStart', (typing) => {
            this.typingTimestamps.set(typing.channel.id, Date.now());
        });

        this.client.on('messageCreate', async (discordMessage) => {
            this.lastMessageTimestamps[discordMessage.channelId] = Date.now();

            try {
                const processedMessage = new DiscordMessage(discordMessage);
                logger.debug(`[DiscordManager] Processed message ID: ${processedMessage.getMessageId()}`);

                const channel = await discordUtils.fetchChannel(this.client, processedMessage.getChannelId());
                const historyMessages = await this.fetchMessages(processedMessage.getChannelId());

                if (channel && historyMessages) {
                    logger.info(`Channel topic: ${channel.topic || "No topic"}. History messages count: ${historyMessages.length}`);
                }

                if (this.messageHandler) {
                    await this.messageHandler(processedMessage, historyMessages);
                }
            } catch (error) {
                logger.error(`[DiscordManager] Error processing message: ${error}`, { errorDetail: error });
            }
        });
    }

    /**
     * Sets a callback function to handle incoming messages.
     * @param {Function} handler - The function to handle new messages.
     */
    setMessageHandler(handler) {
        if (typeof handler !== 'function') {
            logger.error('The message handler must be a function.');
            return;
        }
        this.messageHandler = handler;
    }

    /**
     * Sends a message to a specified channel.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @param {string} messageText - The content of the message to send.
     * @returns {Promise<void>}
     */
    async sendMessage(channelId, messageText) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(messageText);
            logger.info(`Message sent to channel ${channelId}`);
        } catch (error) {
            logger.error(`Failed to send message to channel ${channelId}:`, error);
        }
    }

    /**
     * Signals the bot is typing in the specified channel.
     * @param {string} channelId - The ID of the channel where typing is to be indicated.
     * @returns {Promise<void>}
     */
    async startTyping(channelId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.sendTyping();
            logger.info(`Typing in channel ${channelId}`);
        } catch (error) {
            logger.error(`Failed to start typing in channel ${channelId}:`, error);
        }
    }

    /**
     * Retrieves the last message timestamp for a specified channel.
     * @param {string} channelId - The ID of the channel.
     * @returns {number} The timestamp of the last message.
     */
    getLastMessageTimestamp(channelId) {
        return this.lastMessageTimestamps[channelId] || 0;
    }

    /**
     * Fetches the most recent messages from a specified channel.
     * @param {string} channelId - The ID of the channel.
     * @param {number} limit - The maximum number of messages to retrieve.
     * @returns {Promise<Array>}
     */
    async fetchMessages(channelId, limit = 50) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const messages = await channel.messages.fetch({ limit });
            // Convert fetched messages into DiscordMessage instances and reverse the order
            return Array.from(messages.values()).map(msg => new DiscordMessage(msg)).reverse();
        } catch (error) {
            logger.error(`Failed to fetch messages from channel ${channelId}:`, error);
            return [];  // Return an empty array to handle errors gracefully
        }
    }
    

    /**
     * Retrieves the singleton instance of the DiscordManager.
     * @returns {DiscordManager}
     */
    static getInstance() {
        if (!this.instance) {
            new DiscordManager();
        }
        return this.instance;
    }
}

module.exports = DiscordManager;
