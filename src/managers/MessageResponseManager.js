const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager');
const DiscordMessage = require('../models/DiscordMessage');
const OpenAiManager = require('./OpenAiManager');

/**
 * Manages responses to Discord messages by leveraging OpenAI's API to generate dynamic, context-aware replies.
 */
class MessageResponseManager {
    static instance;
    config;
    timingManager;
    openAiManager;

    /**
     * Initializes the MessageResponseManager with required managers and configurations.
     */
    constructor() {
        logger.debug('Initializing MessageResponseManager with configuration.');
        this.config = this.loadConfig();

        this.timingManager = TimingManager.getInstance();
        this.openAiManager = OpenAiManager.getInstance();
    }

    /**
     * Retrieves the singleton instance of the MessageResponseManager.
     * @returns {MessageResponseManager} The singleton instance.
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new MessageResponseManager();
        }
        return this.instance;
    }

    /**
     * Loads configuration settings from the configuration manager, applying defaults where necessary.
     * @returns {Object} Configuration settings for message responses.
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
     * Decides whether to respond to a given message and schedules the response if appropriate.
     * @param {DiscordMessage} discordMessage The message to respond to.
     */
    async manageResponse(discordMessage) {
        if (!this.isValidMessage(discordMessage) || discordMessage.isFromBot()) {
            logger.debug("Ignoring invalid or bot-originated message.");
            return;
        }

        const decision = await this.shouldReplyToMessage(discordMessage);
        if (!decision.shouldReply) {
            logger.debug("No reply will be made based on the evaluation criteria.");
            return;
        }

        this.timingManager.scheduleMessage(discordMessage.channel.id, decision.responseContent, decision.responseDelay);
    }

    /**
     * Determines if the bot should reply to the message and prepares the response content if so.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {Promise<{shouldReply: boolean, responseContent: string, responseDelay: number}>} Decision and details for the response.
     */
    async shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");

        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            const shouldReply = Math.random() < baseChance;
            const responseContent = shouldReply ? await this.generateResponseContent(discordMessage) : "";
            const responseDelay = this.calculateDelay(discordMessage);

            logger.debug(`Decision to reply: ${shouldReply}, with a delay of ${responseDelay}ms.`);
            return { shouldReply, responseContent, responseDelay };
        }

        return { shouldReply: false, responseContent: "", responseDelay: 0 };
    }

    /**
     * Generates a response using the configured OpenAI model based on the message's content.
     * @param {DiscordMessage} discordMessage The message for which to generate a response.
     * @returns {Promise<string>} The generated response content.
     */
    async generateResponseContent(discordMessage) {
        const prompt = discordMessage.getText();
        const requestBody = this.openAiManager.buildRequestBody([discordMessage], prompt);
        const aiResponse = await this.openAiManager.sendRequest(requestBody);
        return aiResponse.getContent() || "Sorry, I couldn't come up with a response.";
    }

    /**
     * Validates that the provided object is a DiscordMessage instance.
     * @param {any} discordMessage The object to validate.
     * @returns {boolean} True if the object is a valid DiscordMessage, otherwise false.
     */
    isValidMessage(discordMessage) {
        return discordMessage instanceof DiscordMessage;
    }

    /**
     * Calculates the appropriate delay before sending a response to mimic human interaction times.
     * @param {DiscordMessage} discordMessage The message to evaluate for delay calculation.
     * @returns {number} The delay in milliseconds.
     */
    calculateDelay(discordMessage) {
        const hasQuestion = discordMessage.getText().includes('?');
        const delay = hasQuestion ? 500 : 2000;
        logger.debug(`Response delay calculated based on message content: ${delay}ms.`);
        return delay;
    }

    /**
     * Checks if the message content or context triggers a response from the bot.
     * @param {DiscordMessage} discordMessage The message to check.
     * @returns {boolean} True if the message triggers a response, otherwise false.
     */
    isEligibleForReply(discordMessage) {
        const messageText = discordMessage.getText().toLowerCase();
        const isWakewordPresent = this.config.llmWakewords.some(word => messageText.startsWith(word));
        const mentionsUsers = discordMessage.mentionsUsers();
        logger.debug(`Checking message eligibility: Wakeword present: ${isWakewordPresent}, Mentions users: ${mentionsUsers}`);
        return isWakewordPresent || mentionsUsers;
    }

    /**
     * Calculates the base chance that the bot will decide to reply to a message.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {number} The base chance of replying, as a probability between 0 and 1.
     */
    calculateBaseChance(discordMessage) {
        const text = discordMessage.getText();
        let chance = this.config.interrobangBonus * (text.includes('?') ? 1 : 0) +
                     this.config.mentionBonus * (discordMessage.mentionsUsers() ? 1 : 0);
        logger.debug(`Base chance of replying calculated: ${chance}`);
        return Math.min(chance, 1);  // Ensuring the chance does not exceed 100%
    }
}

module.exports = MessageResponseManager;
