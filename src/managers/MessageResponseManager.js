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
 * Manages and schedules bot responses considering various conditions to ensure timely and context-aware interactions.
 * This includes managing response delays to simulate human-like interactions and controlling unsolicited message frequencies.
 */
class MessageResponseManager {
    static instance;
    timingManager;
    config;
    lastActivityTimestamps = {};  // Tracks last activity time by channel ID
    unsolicitedChannelCounts = {}; // Tracks counts of unsolicited messages by channel ID

    /**
     * Constructs the singleton instance of MessageResponseManager.
     */
    constructor() {
        if (MessageResponseManager.instance) {
            return MessageResponseManager.instance;
        }
        this.timingManager = TimingManager.getInstance();
        this.config = this.loadConfig();
        MessageResponseManager.instance = this;
    }

    /**
     * Accesses the singleton instance of the MessageResponseManager.
     * @returns {MessageResponseManager} The singleton instance.
     */
    static getInstance() {
        if (!this.instance) {
            new MessageResponseManager();
        }
        return this.instance;
    }

    /**
     * Loads the configuration settings from a configuration manager, applying defaults for any missing settings.
     * @returns {Object} The fully populated configuration settings.
     */
    loadConfig() {
        const defaults = {
            interrobangBonus: 0.1,
            mentionBonus: 0.5,
            botResponseModifier: -1.0,
            maxDelay: 7000,
            minDelay: 1500,
            decayRate: 0.95,
            llmWakewords: ['!help', '!ping', '!echo'],
            unsolicitedChannelCap: 3,
            decayThreshold: 3000,
            recentActivityDecayRate: 0.5, // The rate at which the chance decays with recent activity
            activityDecayBase: 0.5,  // Base for exponential decay calculation
            activityTimeWindow: 300000,  // Time window in milliseconds (5 minutes)
            channelInactivityLimit: 600000 // 10 minutes in milliseconds
        };
        return {...defaults, ...configurationManager.getConfig('messageResponseSettings')};
    }

    /**
     * Updates the last known activity timestamp for a specified channel.
     * @param {string} channelId - The ID of the channel to update.
     */
    updateLastActivity(channelId) {
        this.lastActivityTimestamps[channelId] = Date.now();
    }

    /**
     * Manages the process of sending a response to a channel based on the provided message and response content.
     * @param {IMessage} message - The message object to respond to.
     * @param {string} responseContent - The content to be sent as a response.
     * @param {number} responseDelay - The initial delay before sending the response, in milliseconds.
     */
    async manageResponse(message, responseContent, responseDelay = 2000) {
        if (!responseContent || message.isFromBot()) {
            return;
        }

        const channelId = message.getChannelId();
        this.updateLastActivity(channelId);
        
        if (!this.shouldSendResponse(message)) {
            return;
        }

        this.incrementUnsolicitedCount(channelId);
        if (this.unsolicitedChannelCounts[channelId] > this.config.unsolicitedChannelCap) {
            return;
        }

        const adjustedDelay = this.calculateAdjustedDelay(channelId, responseDelay);
        setTimeout(() => {
            this.timingManager.scheduleMessage(channelId, responseContent, adjustedDelay);
        }, adjustedDelay);
    }

    /**
     * Calculates if a message should be sent in response to the received message, based on configured probabilities and conditions.
     * @param {IMessage} message - The message to evaluate.
     * @returns {boolean} True if a response should be sent, false otherwise.
     */
    shouldSendResponse(message) {
        const baseChance = this.calculateBaseChance(message);
        return Math.random() < baseChance;
    }

    /**
     * Calculates the base probability of responding to a given message, factoring in message content and special conditions.
     * @param {IMessage} message - The message to evaluate.
     * @returns {number} The probability of sending a response, between 0 and 1.
     */
    calculateBaseChance(message) {
        if (message.getAuthorId() === constants.CLIENT_ID) {
            return 0; // No response to self
        }

        let chance = 0;
        const text = message.getText().toLowerCase();

        if (/[!?]/.test(text.slice(1))) {
            chance += this.config.interrobangBonus;
        }

        if (text.includes(constants.CLIENT_ID)) {
            chance += this.config.mentionBonus;
        }

        if (message.isFromBot()) {
            chance += this.config.botResponseModifier;
        }

        if (this.config.llmWakewords.some(wakeword => text.startsWith(wakeword))) {
            return 1; // Guaranteed response if the message starts with a wakeword
        }

        // Calculate time-based decay factor for response probability
        const timeSinceLastMessage = Date.now() - (this.lastActivityTimestamps[message.getChannelId()] || 0);
        const decayFactor = Math.pow(this.config.activityDecayBase, timeSinceLastMessage / this.config.activityTimeWindow);
        chance *= decayFactor;

        return Math.min(chance, 1); // Probability is capped at 1
    }

    /**
     * Increments the count of unsolicited messages for a given channel.
     * @param {string} channelId - The ID of the channel.
     */
    incrementUnsolicitedCount(channelId) {
        this.unsolicitedChannelCounts[channelId] = (this.unsolicitedChannelCounts[channelId] || 0) + 1;
    }

    /**
     * Calculates an adjusted delay for sending a message based on the channel's last activity time.
     * This method helps in preventing the bot from appearing too "robotic" by spacing out messages naturally.
     * @param {string} channelId - The ID of the channel.
     * @param {number} initialDelay - The initially planned delay, in milliseconds.
     * @returns {number} The adjusted delay, ensuring it meets minimum configured thresholds.
     */
    calculateAdjustedDelay(channelId, initialDelay) {
        const timeSinceLastActivity = Date.now() - (this.lastActivityTimestamps[channelId] || 0);
        let delay = initialDelay * Math.exp(-this.config.decayRate * timeSinceLastActivity / this.config.decayThreshold);
        return Math.max(delay, this.config.minDelay);
    }

    /**
     * Determines if a message should be considered unsolicited based on its content.
     * @param {IMessage} message - The message to evaluate.
     * @returns {boolean} True if the message is unsolicited, false otherwise.
     */
    async shouldReplyToMessage(message) {
        const probabilityOfResponse = Math.random();
        const baseChance = this.calculateBaseChance(message);
        logger.debug(`[MessageResponseManager] Base chance for message ID: ${message.getMessageId()} is ${baseChance}.`);
        return probabilityOfResponse < baseChance;    }

}

module.exports = MessageResponseManager;
