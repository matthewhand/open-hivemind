const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager');
const DiscordMessage = require('../models/DiscordMessage');
const OpenAiManager = require('./OpenAiManager');

/**
 * Manages the bot's responses to Discord messages by determining if and when responses should be sent,
 * and leveraging OpenAI for generating response content. This manager orchestrates the timing of responses
 * to simulate more natural interactions.
 */
class MessageResponseManager {
    static instance;
    config;
    timingManager;
    openAiManager;

    /**
     * Private constructor to initialize the MessageResponseManager with configurations from the config manager.
     */
    constructor() {
        logger.debug('Initializing MessageResponseManager with configuration.');
        this.config = this.loadConfig();

        this.timingManager = TimingManager.getInstance();
        this.openAiManager = OpenAiManager.getInstance();
    }

    /**
     * Singleton pattern implementation to get the instance of MessageResponseManager.
     * @returns {MessageResponseManager} The singleton instance.
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new MessageResponseManager();
        }
        return this.instance;
    }

    /**
     * Loads the configuration for message responses, applying defaults where necessary.
     * @returns {Object} The configuration settings for message responses.
     */
    loadConfig() {
        const defaults = {
            interrobangBonus: 0.3,
            mentionBonus: 0.4,
            botResponsePenalty: 0.5,
            maxDelay: 10000,
            minDelay: 1000,
            decayRate: -0.5,
            llmWakewords: ['!help', '!ping', '!echo'],
            unsolicitedChannelCap: 2
        };
        
        const config = configurationManager.getConfig('messageResponse') || {};
        config.llmWakewords = config.llmWakewords ? config.llmWakewords.split(',').map(s => s.trim()) : defaults.llmWakewords;
        
        return { ...defaults, ...config };
    }

    /**
     * Decides whether to respond to a particular message and schedules the response.
     * @param {DiscordMessage} discordMessage The message to potentially respond to.
     */
    async manageResponse(discordMessage) {
        if (!this.isValidMessage(discordMessage) || discordMessage.isFromBot()) {
            logger.debug("Ignoring invalid message or message from another bot.");
            return;
        }

        const decision = await this.shouldReplyToMessage(discordMessage);
        if (!decision.shouldReply) {
            logger.debug("Decision not to reply made based on evaluation criteria.");
            return;
        }

        this.timingManager.scheduleMessage(discordMessage.channel.id, decision.responseContent, decision.responseDelay);
    }

    /**
     * Evaluates whether the bot should reply to a given message based on content triggers and other criteria.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {Promise<{shouldReply: boolean, responseContent: string, responseDelay: number}>} Decision on replying.
     */
    async shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");

        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            const shouldReply = Math.random() < baseChance;
            const responseContent = shouldReply ? await this.generateResponseContent(discordMessage) : "";
            const responseDelay = this.calculateDelay(discordMessage);

            logger.debug(`Decision to reply: ${shouldReply}, Response delay: ${responseDelay}ms`);
            return { shouldReply, responseContent, responseDelay };
        }

        return { shouldReply: false, responseContent: "", responseDelay: 0 };
    }

    /**
     * Determines if a message meets the criteria for triggering a bot response.
     * @param {DiscordMessage} discordMessage The message to check.
     * @returns {boolean} True if the message triggers a response, otherwise false.
     */
    isEligibleForReply(discordMessage) {
        const messageText = discordMessage.getText().toLowerCase();
        const isWakewordPresent = this.config.llmWakewords.some(word => messageText.startsWith(word));
        const mentionsUsers = discordMessage.mentionsUsers();

        logger.debug(`Wakeword present: ${isWakewordPresent}, Mentions users: ${mentionsUsers}`);
        return isWakewordPresent || mentionsUsers;
    }

    /**
     * Computes the base chance of the bot deciding to reply based on the message's content.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {number} The probability of replying.
     */
    calculateBaseChance(discordMessage) {
        const text = discordMessage.getText();
        let chance = this.config.interrobangBonus * (text.includes('?') ? 1 : 0) + 
                     this.config.mentionBonus * (discordMessage.mentionsUsers() ? 1 : 0);

        logger.debug(`Base chance of replying: ${chance}`);
        return Math.min(chance, 1); // Ensuring the chance does not exceed 100%
    }

    /**
     * Calculates the delay before sending a message, aiming to mimic human response times.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {number} The delay in milliseconds before sending the response.
     */
    calculateDelay(discordMessage) {
        const hasQuestion = discordMessage.getText().includes('?');
        const delay = hasQuestion ? 500 : 2000;
        logger.debug(`Calculated response delay: ${delay}ms for message: ${hasQuestion ? 'with' : 'without'} a question mark.`);
        return delay;
    }

    /**
     * Generates a response using the OpenAI model based on the message's content.
     * @param {DiscordMessage} discordMessage The message needing a response.
     * @returns {Promise<string>} The generated response content.
     */
    async generateResponseContent(discordMessage) {
        logger.debug(`Generating response for message: ${discordMessage.getText().substring(0, 50)}...`);
        try {
            const response = await this.openAiManager.generateResponse(discordMessage.getText());
            logger.debug(`Response generated: ${response.substring(0, 50)}...`);
            return response;
        } catch (error) {
            logger.error(`Error generating response: ${error}`);
            return "Sorry, I couldn't come up with a response.";
        }
    }

    /**
     * Checks if the provided message is a valid DiscordMessage instance.
     * @param {DiscordMessage} discordMessage The message to validate.
     * @returns {boolean} True if valid, false otherwise.
     */
    isValidMessage(discordMessage) {
        const isValid = discordMessage instanceof DiscordMessage;
        logger.debug(`Message validation result: ${isValid}`);
        return isValid;
    }
}

module.exports = MessageResponseManager;
