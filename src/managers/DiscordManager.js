const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');
const DiscordMessage = require('../models/DiscordMessage');

/**
 * Manages interactions with the Discord API, including message handling and channel operations.
 */
class DiscordManager {
    static instance; //
    client;
    typingTimestamps = new Map(); // Maps channel IDs to the last typing timestamp


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
        this.client.on('typingStart', (channel) => {
            if (!channel) {
                logger.error('[DiscordManager] TypingStart event received without a channel object.');
                return;
            }
            logger.debug(`[DiscordManager] Typing started in channel ID: ${channel.id}`);
            this.typingTimestamps.set(channel.id, Date.now());
        });

        this.client.on('messageCreate', async (discordMessage) => {
            logger.debug(`[DiscordManager] Received messageCreate event with message ID: ${discordMessage.id}`);
    
            try {
                const processedMessage = new DiscordMessage(discordMessage);
                logger.debug(`[DiscordManager] Processed message ID: ${processedMessage.message.id}, Content: "${processedMessage.getText().substring(0, 50)}..."`); // Log first 50 chars of the message
    
                if (this.shouldFetchContext(processedMessage)) {
                    logger.debug(`[DiscordManager] Fetching context for message ID: ${processedMessage.message.id}`);
                    const { channelTopic, historyMessages } = await discordUtils.fetchChannelContext(this.client, processedMessage.getChannelId());
                    processedMessage.channelTopic = channelTopic;
                    processedMessage.historyMessages = historyMessages;
                    logger.debug(`[DiscordManager] Context fetched for message ID: ${processedMessage.message.id}. Channel Topic: ${channelTopic}, History Messages Count: ${historyMessages.length}`);
                } else {
                    logger.debug(`[DiscordManager] Context fetch skipped for message ID: ${processedMessage.message.id}`);
                }
    
                if (this.messageHandler) {
                    logger.debug(`[DiscordManager] Passing processed message ID: ${processedMessage.message.id} to the message handler`);
                    // Pass the processed message and its history to the message handler
                    await this.messageHandler(processedMessage, processedMessage.historyMessages);
                    logger.debug(`[DiscordManager] Message handler processed message ID: ${processedMessage.message.id}`);
                } else {
                    logger.warn('[DiscordManager] Message handler not set in DiscordManager.');
                }
            } catch (error) {
                logger.error(`[DiscordManager] Error processing message ID: ${discordMessage.id}: ${error}`, { errorDetail: error });
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
    const MAX_LENGTH = 2000; // Discord's max message length
    let messageParts = [];

    logger.debug(`[sendResponse] Preparing to send message to channelId: ${channelId}. Original message: ${messageText}`);

    // Ensure messageText is a string
    messageText = String(messageText);

    // Debug for message length
    logger.debug(`[sendResponse] Message length: ${messageText.length}`);

    // Check for code blocks to avoid splitting them
    if (messageText.match(/```[\s\S]*?```/)) {
        logger.debug('[sendResponse] Detected code block, keeping message intact.');
        messageParts = [messageText]; // Keep code blocks intact
    } else {
        // Split message without breaking words
        while (messageText.length) {
            if (messageText.length <= MAX_LENGTH) {
                logger.debug('[sendResponse] Message part within limit, adding to parts.');
                messageParts.push(messageText);
                break; // The remainder of the message is within the limit
            } else {
                // Find last newline before the limit
                let lastIndex = messageText.substring(0, MAX_LENGTH).lastIndexOf('\n');
                // If no newline is found, use the maximum length
                if (lastIndex === -1) lastIndex = MAX_LENGTH;
                logger.debug(`[sendResponse] Splitting message at index: ${lastIndex}`);
                messageParts.push(messageText.substring(0, lastIndex));
                // Remove the processed part from the messageText
                messageText = messageText.substring(lastIndex).trim();
            }
        }
    }

    logger.debug(`[sendResponse] Split into ${messageParts.length} parts due to length.`);

    // Send each part as a separate message
    for (const part of messageParts) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(part);
            logger.debug(`[DiscordManager] Successfully sent a message part to channelId: ${channelId}`);
        } catch (error) {
            logger.error(`[DiscordManager] Failed to send message part to channelId: ${channelId}. Error: ${error}`);
        }
    }
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
     * Fetches channel context using the utility function from discordUtils.
     * This method acts as a pass-through to centralize the fetching logic.
     * 
     * @param {string} channelId - The ID of the channel.
     * @returns {Promise<Object>} A promise that resolves to the channel context, including topic and historyMessages.
     */
    async fetchChannelContext(channelId) {
        logger.debug(`Fetching context for channel ID: ${channelId} using discordUtils.`);
        return discordUtils.fetchChannelContext(this.client, channelId)
            .then(context => {
                logger.debug(`Context fetched for channel ID: ${channelId}.`);
                return context;
            })
            .catch(error => {
                logger.error(`Error fetching context for channel ID: ${channelId}:`, error);
                throw error; // Rethrow error to be handled by the caller
            });
    }

    /**
     * Initiates typing in a specified channel.
     * @param {string} channelId - The ID of the channel to start typing in.
     */
    startTyping(channelId) {
        const channel = this.client.channels.cache.get(channelId);
        if (channel) {
            channel.startTyping();
        } else {
            logger.error(`Channel with ID ${channelId} not found.`);
        }
    }

    /**
     * Stops typing in a specified channel.
     * @param {string} channelId - The ID of the channel to stop typing in.
     */
    stopTyping(channelId) {
        const channel = this.client.channels.cache.get(channelId);
        if (channel) {
            channel.stopTyping(true);
        } else {
            logger.error(`Channel with ID ${channelId} not found.`);
        }
    }

    /**
     * Gets the timestamp of the last typing event in a channel.
     * If not set, returns the current timestamp.
     * @param {string} channelId The ID of the channel to check.
     * @returns {number} The Unix timestamp of the last typing event or the current timestamp if no data is available.
     */
    getLastTypingTimestamp(channelId) {
        return this.typingTimestamps.get(channelId) || Date.now();
    }


}

module.exports = DiscordManager;
