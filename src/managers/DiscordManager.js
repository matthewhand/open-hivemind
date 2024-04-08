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
            if (!channel) {
                logger.error('[DiscordManager] TypingStart event received without a channel object.');
                return;
            }
            this.typingTimestamps.set(channel.id, Date.now());
        });

        this.client.on('messageCreate', async (discordMessage) => {
            try {
                const processedMessage = new DiscordMessage(discordMessage);
                logger.debug(`[DiscordManager] Processed message ID: ${processedMessage.getMessageId()}`);
                
                // Implementation of message processing and event handling logic here...
                
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
        return discordUtils.fetchMessages(this.client, channelId);
    }

    /**
     * Sends a response message to a specified channel, splitting it if it exceeds Discord's character limit.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @param {string} messageText - The text of the message to be sent.
     * @returns {Promise<void>}
     */
    async sendResponse(channelId, messageText) {
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
}

module.exports = DiscordManager;
