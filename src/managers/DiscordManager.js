const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');

/**
 * Manages interactions with the Discord API, including message handling and channel operations.
 */
class DiscordManager {
    static instance;
    client;

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
     * Initializes the Discord client and sets up event handlers.
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
     * Sets up the event handlers for incoming Discord events.
     */
    setupEventHandlers() {
        this.client.on('messageCreate', async (discordMessage) => {
            try {
                const processedMessage = new DiscordMessage(discordMessage);
                
                if (this.shouldFetchContext(processedMessage)) {
                    const { channelTopic, historyMessages } = await discordUtils.fetchChannelContext(this.client, processedMessage.getChannelId());
                    processedMessage.channelTopic = channelTopic;
                    processedMessage.historyMessages = historyMessages;
                }
    
                if (this.messageHandler) {
                    // Pass the processed message and its history to the message handler
                    await this.messageHandler(processedMessage, processedMessage.historyMessages);
                } else {
                    logger.warn('Message handler not set in DiscordManager.');
                }
            } catch (error) {
                logger.error(`Error processing message: ${error}`, { errorDetail: error });
            }
        });
    }
    
    /**
     * Registers a callback function to handle messages.
     * @param {Function} messageHandlerCallback - The callback function to handle messages.
     */
    setMessageHandler(messageHandlerCallback) {
        if (typeof messageHandlerCallback !== 'function') {
            throw new Error("messageHandlerCallback must be a function");
        }
        this.messageHandler = messageHandlerCallback;
    }

    /**
     * Fetches a specified number of messages from a given channel.
     * @param {string} channelId - The ID of the channel to fetch messages from.
     * @returns {Promise<Array>} A promise that resolves to an array of DiscordMessage instances.
     */
    async fetchMessages(channelId) {
        return discordUtils.fetchMessages(this.client, channelId);
    }
    
    /**
     * Sends a message to a specified channel.
     * @param {string} channelId - The ID of the channel to send the message to.
     * @param {string} messageText - The text of the message to be sent.
     * @returns {Promise<void>}
     */
    async sendResponse(channelId, messageText) {
        return discordUtils.sendResponse(this.client, channelId, messageText);
    }

    /**
     * Determines if the channel context should be fetched based on the message.
     * @param {DiscordMessage} processedMessage - The message to evaluate.
     * @returns {boolean} True if the context should be fetched, otherwise false.
     */
    shouldFetchContext(processedMessage) {
        // Implement logic to decide whether to fetch context based on the message characteristics
        return true;
    }

    /**
     * Retrieves a singleton instance of DiscordManager.
     * @returns {DiscordManager} The singleton instance.
     */
    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }


    /**
     * Previously used to fetch channel context directly within DiscordManager.
     * This function is now deprecated.
     * @deprecated Since version [next_version]. Use discordUtils.fetchChannelContext instead.
     * @param {string} channelId - The ID of the channel.
     * @throws {Error} Throws a deprecation error.
     */
    async fetchChannelContext(channelId) {
        // Option 1: Throw an explicit deprecation error
        throw new Error("fetchChannelContext is deprecated. Please use discordUtils.fetchChannelContext instead.");

        // Option 2: Log a deprecation warning and mimic a failure
        logger.warn("fetchChannelContext is deprecated and will be removed in future versions. Please use discordUtils.fetchChannelContext instead.");
        // Simulate a failed operation without breaking existing code that might not check for errors properly
        return Promise.reject(new Error("fetchChannelContext is deprecated."));
    }

    /**
     * Previously used to initiate typing in a channel directly within DiscordManager.
     * This function is now deprecated.
     * @deprecated Since version [next_version]. Handle typing indicators externally.
     * @param {string} channelId - The ID of the channel to start typing in.
     * @throws {Error} Throws a deprecation error.
     */
    async startTyping(channelId) {
        throw new Error("startTyping is deprecated and should not be used. Handle typing indicators externally.");
    }

    /**
     * Previously used to stop typing in a channel directly within DiscordManager.
     * This function is now deprecated.
     * @deprecated Since version [next_version]. Handle typing indicators externally.
     * @param {string} channelId - The ID of the channel to stop typing in.
     * @throws {Error} Throws a deprecation error.
     */
    stopTyping(channelId) {
        throw new Error("stopTyping is deprecated and should not be used. Handle typing indicators externally.");
    }


}

module.exports = DiscordManager;
