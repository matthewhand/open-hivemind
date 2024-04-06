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
/**
 * Sends a message to a specified channel.
 * @param {string} channelId - The ID of the channel to send the message to.
 * @param {string} messageText - The text of the message to be sent.
 * @returns {Promise<void>}
 */
async sendResponse(channelId, messageText) {
    const MAX_LENGTH = 2000; // Discord's max message length
    let messageParts = [];

    logger.debug(`[sendResponse] Original messageText: ${messageText}`);

    messageText = String(messageText);

    // Check for code blocks to avoid splitting them
    if (messageText.match(/```[\s\S]*?```/)) {
        logger.debug('[sendResponse] Message contains code block. Keeping intact.');
        messageParts = [messageText]; // Keep code blocks intact
    } else {
        logger.debug('[sendResponse] Splitting message.');
        // Split message without breaking words
        while (messageText.length) {
            if (messageText.length <= MAX_LENGTH) {
                logger.debug('[sendResponse] Adding remaining part of message.');
                messageParts.push(messageText);
                break; // The remainder of the message is within the limit
            } else {
                // Find last newline before the limit
                let lastIndex = messageText.substring(0, MAX_LENGTH).lastIndexOf('\n');
                logger.debug(`[sendResponse] Last index of newline: ${lastIndex}`);

                // If no newline is found, use the maximum length
                lastIndex = lastIndex > 0 ? lastIndex : MAX_LENGTH;
                messageParts.push(messageText.substring(0, lastIndex));
                // Remove the processed part from the messageText
                messageText = messageText.substring(lastIndex).trim();

                logger.debug(`[sendResponse] Message split. Remaining length: ${messageText.length}`);
            }
        }
    }

    logger.debug(`[sendResponse] Number of message parts: ${messageParts.length}`);

    // Send each part as a separate message
    for (const part of messageParts) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(part);
            logger.debug(`[DiscordManager] Message part sent to channel ID: ${channelId}`);
        } catch (error) {
            logger.error(`[DiscordManager] Failed to send message part to channel ID: ${channelId}: ${error}`);
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
