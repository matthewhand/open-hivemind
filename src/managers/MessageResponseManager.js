/**
 * The MessageResponseManager is responsible for managing and timing the responses sent by the bot,
 * based on a variety of configured conditions and modifiers. This manager dynamically loads and
 * applies configuration settings that affect how responses are generated and delivered.
 *
 * Configuration settings include:
 * - `interrobangBonus`: Added to the chance of replying when the message contains '!' or '?' anywhere except as the first character.
 * - `mentionBonus`: Increases the chance of replying when the bot's ID (as specified by CLIENT_ID in constants) is mentioned.
 * - `botResponseModifier`: Adjusts the chance of replying when the message originates from a bot (negative values decrease the chance).
 * - `maxDelay` and `minDelay`: Specify the maximum and minimum delay timings for starting to type responses and for waiting between sending parts of long messages that exceed Discord's character limit.
 * - `decayRate`: Used to reduce the waiting time incrementally when the bot is waiting for the channel to become idle.
 * - `llmWakewords`: A set of keywords that, when found at the start of a message, ensure the bot will respond.
 * - `unsolicitedChannelCap`: Limits the number of channels the bot will send unsolicited messages to, helping manage spam and bot activity visibility.
 *
 * These settings are loaded from the configuration manager and are merged with default values to ensure all settings are initialized properly.
 */
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager');
const configurationManager = require('../config/configurationManager');
const constants = require('../config/constants'); // Assuming this contains CLIENT_ID
const { IMessage } = require('../interfaces/IMessage');

/**
 * Manages and schedules responses by the bot, incorporating various interaction-driven modifiers.
 * Utilizes detailed logging for debugging and JSDoc comments for better maintainability.
 */
class MessageResponseManager {
    static instance;
    timingManager;
    config;
    lastActivityTimestamps = {};  // Tracks last activity time by channel ID
    unsolicitedChannelCounts = {}; // Tracks counts of unsolicited messages by channel ID

    /**
     * Ensures a single instance of the manager is used throughout the application.
     */
    constructor() {
        if (MessageResponseManager.instance) {
            logger.debug("[MessageResponseManager] An instance already exists. Skipping creation.");
            return MessageResponseManager.instance;
        }
        this.timingManager = TimingManager.getInstance();
        this.config = this.loadConfig();
        MessageResponseManager.instance = this;
        logger.debug("[MessageResponseManager] An instance was created.");
    }

    /**
     * Provides access to the singleton instance of the MessageResponseManager.
     * @returns {MessageResponseManager} The singleton instance.
     */
    static getInstance() {
        if (!this.instance) {
            logger.debug("[MessageResponseManager] Creating a new instance.");
            new MessageResponseManager();
        }
        return this.instance;
    }

    /**
     * Loads and returns configuration settings, applying defaults where necessary.
     * @returns {Object} The configuration settings object.
     */
    loadConfig() {
        const defaults = {
            interrobangBonus: 0.2,
            mentionBonus: 0.6,
            botResponseModifier: -0.8,
            maxDelay: 10000,
            minDelay: 1000,
            decayRate: 0.1,
            llmWakewords: ['!help', '!ping', '!echo'],
            unsolicitedChannelCap: 2,
            decayThreshold: 3000,
            channelInactivityLimit: 86400000 // 24 hours in milliseconds
        };
        const config = {...defaults, ...configurationManager.getConfig('messageResponseSettings')};
        logger.debug("[MessageResponseManager] Configuration loaded.");
        return config;
    }

    /**
     * Updates the last activity time for a specified channel.
     * @param {string} channelId - The ID of the channel.
     */
    updateLastActivity(channelId) {
        this.lastActivityTimestamps[channelId] = Date.now();
        logger.debug(`[MessageResponseManager] Updated last activity time for channel ID: ${channelId}`);
    }

    /**
     * Manages the sending of a response if conditions are met, including response content generation and timing.
     * @param {IMessage} message - The message object to respond to.
     * @param {string} responseContent - The content of the response.
     * @param {number} responseDelay - The initial delay before sending the response.
     */
    async manageResponse(message, responseContent, responseDelay) {
        logger.debug("[MessageResponseManager] Attempting to manage response.");
        if (!responseContent) {
            logger.debug("[MessageResponseManager] No response content provided.");
            return;
        }

        if (message.isFromBot()) {
            logger.debug("[MessageResponseManager] Ignoring bot's own message.");
            return;
        }

        const channelId = message.getChannelId();
        this.updateLastActivity(channelId);

        if (!this.shouldSendResponse(message)) {
            logger.debug("[MessageResponseManager] Conditions not met for sending response.");
            return;
        }

        if (this.shouldConsiderUnsolicited(message)) {
            this.resetUnsolicitedCountIfNeeded(channelId);
            if (this.unsolicitedChannelCounts[channelId] >= this.config.unsolicitedChannelCap) {
                logger.info(`[MessageResponseManager] Unsolicited message cap reached for channel ID: ${channelId}.`);
                return; // Skip sending to avoid spam
            }
            this.unsolicitedChannelCounts[channelId] = (this.unsolicitedChannelCounts[channelId] || 0) + 1;
        }

        const currentTime = Date.now();
        const lastActivityTime = this.lastActivityTimestamps[channelId] || 0;
        const timeSinceLastActivity = currentTime - lastActivityTime;
        const adjustedDelay = this.calculateAdjustedDelay(timeSinceLastActivity, responseDelay);

        if (adjustedDelay > this.config.decayThreshold) {
            logger.debug(`[MessageResponseManager] Postponing response due to recent activity. New delay: ${adjustedDelay}ms.`);
            setTimeout(() => this.manageResponse(message, responseContent, this.config.minDelay), adjustedDelay);
            return;
        }

        logger.info(`[MessageResponseManager] Scheduling response to message ID: ${message.getMessageId()} with an adjusted delay of ${adjustedDelay}ms.`);
        await this.timingManager.scheduleMessage(channelId, responseContent, adjustedDelay);
    }

    /**
     * Resets the unsolicited message count for a channel if there has been significant inactivity.
     * @param {string} channelId - The ID of the channel to check.
     */
    resetUnsolicitedCountIfNeeded(channelId) {
        const lastActive = this.lastActivityTimestamps[channelId] || 0;
        const timeSinceLastActive = Date.now() - lastActive;
        if (timeSinceLastActive > this.config.channelInactivityLimit) {
            this.unsolicitedChannelCounts[channelId] = 0; // Reset the count due to inactivity
            logger.debug(`[MessageResponseManager] Reset unsolicited count for channel ID: ${channelId}`);
        }
    }

    /**
     * Determines if a message should be considered unsolicited based on its content.
     * @param {IMessage} message - The message to evaluate.
     * @returns {boolean} True if the message is unsolicited, false otherwise.
     */
    shouldConsiderUnsolicited(message) {
        const isUnsolicited = !message.getText().toLowerCase().startsWith(tuple => tuple[1]);
        logger.debug(`[MessageResponseManager] Message ID: ${message.getMessageId()} is ${isUnsolicited ? '' : 'not '}unsolicited.`);
        return isUnsolicited;
    }

    /**
     * Determines if the bot should reply to the message and prepares the response content if so.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {Promise<{shouldReply: boolean, responseContent: string, responseDelay: number}>} Decision and details for the response.
     */
    async shouldReplyToMessage(discordMessage) {
        return this.shouldSendResponse(discordMessage);
    }

    /**
     * Calculates the adjusted delay for sending a message based on the last activity time.
     * @param {number} timeSinceLastActivity - The time in milliseconds since the last activity in the channel.
     * @param {number} initialDelay - The initial proposed delay.
     * @returns {number} The adjusted delay.
     */
    calculateAdjustedDelay(timeSinceLastActivity, initialDelay) {
        const decayedDelay = initialDelay - (this.config.decayRate * timeSinceLastActivity);
        const adjustedDelay = Math.max(decayedDelay, this.config.decayThreshold);
        logger.debug(`[MessageResponseManager] Calculated adjusted delay: ${adjustedDelay}ms for initial delay: ${initialDelay}ms.`);
        return adjustedDelay;
    }

    /**
     * Determines if the bot should send a response based on random probability and the calculated base chance.
     * @param {IMessage} message - The message to evaluate.
     * @returns {boolean} True if the bot should send a response, false otherwise.
     */
    shouldSendResponse(message) {
        const probabilityOfResponse = Math.random();
        const baseChance = this.calculateBaseChance(message);
        logger.debug(`[MessageResponseManager] Base chance for message ID: ${message.getMessageId()} is ${baseChance}.`);
        return probabilityOfResponse < baseChance;
    }

    /**
     * Calculates the base chance of responding based on message content and interaction modifiers.
     * @param {IMessage} message - The message to evaluate.
     * @returns {number} The base chance of responding, as a probability between 0 and 1.
     */
    calculateBaseChance(message) {
        const text = message.getText().toLowerCase();
        let chance = 0;
        
        const authorId = message.getAuthorId();
        if (authorId === constants.CLIENT_ID) {
            return 0; // Exits early if the bot is the author
        }

        if (/[!?]/.test(text.slice(1))) {
            chance += this.config.interrobangBonus;
        }

        if (text.includes(constants.CLIENT_ID)) {
            chance += this.config.mentionBonus;
        }

        if (message.isFromBot()) {
            chance -= this.config.botResponseModifier;
        }

        const startsWithWakeword = this.config.llmWakewords.some(wakeword => text.startsWith(wakeword));
        if (startsWithWakeword) {
            return 1;
        }

        logger.debug(`[MessageResponseManager] Final chance for message ID: ${message.getMessageId()} is ${chance}.`);
        return Math.min(chance, 1); // Ensures the probability does not exceed 1
    }
}

module.exports = MessageResponseManager;
