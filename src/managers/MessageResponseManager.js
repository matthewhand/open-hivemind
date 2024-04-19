/**
 * Manages the decision-making process for sending responses by the bot, using configured conditions and modifiers.
 * Implements a singleton pattern to ensure consistent application of settings and prioritizes a specific
 * channel that can always receive unsolicited messages, regardless of other limits.
 *
 * @module MessageResponseManager
 */
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const constants = require('../config/constants'); // This should contain CLIENT_ID and possibly CHANNEL_ID

class MessageResponseManager {
    static instance;
    config;

    /**
     * Constructs a singleton instance of the MessageResponseManager.
     * If an instance already exists, it returns the existing instance instead of creating a new one.
     */
    constructor() {
        if (MessageResponseManager.instance) {
            return MessageResponseManager.instance;
        }
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
     * Loads configuration settings from the central configuration manager, applying defaults where not specified.
     * @returns {Object} The configuration settings, populated with defaults and external configurations.
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
            priorityChannel: constants.CHANNEL_ID,
            decayThreshold: 3000,
            recentActivityDecayRate: 0.5,
            activityDecayBase: 0.5,
            activityTimeWindow: 300000,
            channelInactivityLimit: 600000
        };
        const config = { ...defaults, ...configurationManager.getConfig('messageResponseSettings') };
        logger.debug("Configuration loaded: ", config);
        return config;
    }

    /**
     * Determines whether the bot should respond to a specific message.
     * @param {IMessage} message - The message object to evaluate.
     * @param {number} [timeSinceLastActivity=5000] - The time in milliseconds since the last activity in the channel.
     * @returns {boolean} True if the bot should respond, false otherwise.
     */
    shouldReplyToMessage(message, timeSinceLastActivity = 5000) {
        const channelId = message.getChannelId();
        logger.debug(`[MessageResponseManager] Evaluating reply possibility for message from channel ${channelId}.`);

        if (!this.isEligibleForResponse(message)) {
            logger.debug("[MessageResponseManager] Message is not eligible for a response.");
            return false;
        }

        if (!this.isWithinUnsolicitedLimit(channelId)) {
            logger.debug("[MessageResponseManager] Channel has exceeded the unsolicited message limit.");
            return false;
        }

        const shouldSend = this.shouldSendResponse(message, timeSinceLastActivity);
        logger.debug(`[MessageResponseManager] Decision to send response: ${shouldSend}`);
        return shouldSend;
    }

    /**
     * Checks if the message meets basic criteria to be eligible for a response.
     * @param {IMessage} message - The message to check.
     * @returns {boolean} True if the message is eligible, false otherwise.
     */
    isEligibleForResponse(message) {
        const isEligible = message.getText() && !message.isFromBot();
        logger.debug(`Message eligibility for response: ${isEligible}`);
        return isEligible;
    }

    /**
     * Verifies if the channel is within its limit for sending unsolicited messages or is the priority channel.
     * @param {string} channelId - The ID of the channel to check.
     * @returns {boolean} True if the channel can still send unsolicited messages, false otherwise.
     */
    isWithinUnsolicitedLimit(channelId) {
        const isWithinLimit = channelId === this.config.priorityChannel || this.unsolicitedChannelCounts[channelId] < this.config.unsolicitedChannelCap;
        logger.debug(`Unsolicited message limit check for channel ${channelId}: ${isWithinLimit}`);
        return isWithinLimit;
    }

    /**
     * Determines if a response should be sent based on a random chance compared to the calculated base chance, including time decay factors.
     * @param {IMessage} message - The message to evaluate.
     * @param {number} timeSinceLastActivity - Time in milliseconds since the last activity in the channel.
     * @returns {boolean} True if a response should be sent, false otherwise.
     */
    shouldSendResponse(message, timeSinceLastActivity) {
        const baseChance = this.calculateBaseChance(message, timeSinceLastActivity);
        const decision = Math.random() < baseChance;
        logger.debug(`Should send response (random < baseChance): ${decision} (${Math.random()} < ${baseChance})`);
        return decision;
    }

    /**
     * Calculates the base probability of responding to a given message, factoring in message content, special conditions, and activity decay.
     * @param {IMessage} message - The message to evaluate.
     * @param {number} timeSinceLastActivity - Time in milliseconds since the last activity, used to calculate decay.
     * @returns {number} The probability of sending a response, between 0 and 1.
     */
    calculateBaseChance(message, timeSinceLastActivity) {
        if (message.getAuthorId() === constants.CLIENT_ID) {
            logger.debug("Not responding to self-generated messages.");
            return 0; // Do not respond to self
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
            logger.debug("Wakeword found, responding immediately.");
            return 1; // Guaranteed response if wakeword is matched
        }

        const decayFactor = Math.exp(-this.config.recentActivityDecayRate * (timeSinceLastActivity / this.config.activityTimeWindow));
        chance *= decayFactor;
        
        logger.debug(`Calculated base chance for response: ${chance}`);
        return Math.min(chance, 1);
    }
}

module.exports = MessageResponseManager;
