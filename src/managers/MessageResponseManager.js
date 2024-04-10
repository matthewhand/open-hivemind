const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager');
const DiscordMessage = require('../models/DiscordMessage');
const OpenAiManager = require('./OpenAiManager');

/**
 * Manages the bot's responses to Discord messages, incorporating dynamic response timing
 * for a more natural interaction experience and using OpenAI for content generation.
 */
class MessageResponseManager {
    static instance;

    /**
     * Initializes a new instance of the MessageResponseManager.
     */
    constructor() {
        logger.debug('Initializing MessageResponseManager with configuration.');
        this.config = configurationManager.getConfig('messageResponse') || this.defaultConfig();
        this.config.llmWakewords = this.getWakeWords();

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
     * Provides default configuration values for the message response manager.
     * @returns {Object} The default configuration settings.
     */
    defaultConfig() {
        return {
            interrobangBonus: 0.3,  // Bonus chance of replying when the message contains '?' or '!'
            mentionBonus: 0.4,      // Bonus chance of replying when the bot is directly mentioned
            botResponsePenalty: 0.5, // Penalty applied to prevent replying to bots
            maxDelay: 10000,        // Maximum delay in milliseconds before sending a response
            minDelay: 1000,         // Minimum delay in milliseconds before sending a response
            decayRate: -0.5,        // Rate at which the delay decreases over time
            llmWakewords: '!ping',  // Default wake words
        };
    }

    /**
     * Manages the decision to respond to a message and schedules the response using the TimingManager.
     * @param {DiscordMessage} discordMessage - The received message to manage a response for.
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

        const responseContent = await this.generateResponseContent(discordMessage);
        this.timingManager.scheduleMessage(discordMessage.channel.id, responseContent, decision.responseDelay);
    }

    /**
     * Evaluates if a message meets the defined criteria for the bot to generate a reply.
     * This can include checks for direct mentions, specific channel IDs, message content triggers,
     * or other custom criteria defined for interaction.
     * @param {DiscordMessage} discordMessage - The Discord message object to evaluate.
     * @returns {Promise<{shouldReply: boolean, responseDelay: number}>} - Decision and delay before sending the reply.
     */
    async shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");

        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            logger.debug(`Base chance calculated: ${baseChance}`);

            const responseDelay = this.calculateDelay(discordMessage);
            logger.debug(`Response delay calculated: ${responseDelay}ms`);

            const randomChance = Math.random();
            const shouldReply = randomChance < baseChance;
            logger.debug(`Random chance: ${randomChance}, should reply: ${shouldReply}`);

            return { shouldReply, responseDelay };
        }

        logger.debug("Message does not meet reply criteria.");
        return { shouldReply: false, responseDelay: 0 };
    }

    /**
     * Checks if the message content includes any of the wakewords defined in the configuration,
     * or if the bot is directly mentioned.
     * @param {DiscordMessage} discordMessage - The message to check.
     * @returns {boolean} - True if the message is eligible for a reply, otherwise false.
     */
    isEligibleForReply(discordMessage) {
        const messageText = discordMessage.getText().toLowerCase();
        const isWakewordPresent = this.config.llmWakewords.some(word => messageText.startsWith(word));
        logger.debug(`Message "${messageText}" wakeword check: ${isWakewordPresent}`);

        const mentionsUsers = discordMessage.mentionsUsers();
        logger.debug(`Message mentions users: ${mentionsUsers}`);

        return isWakewordPresent || mentionsUsers;
    }

    /**
     * Calculates the base chance of replying based on the message content.
     * @param {DiscordMessage} discordMessage - The message to evaluate.
     * @returns {number} - The calculated base chance of replying.
     */
    calculateBaseChance(discordMessage) {
        const hasQuestionMark = discordMessage.getText().includes('?');
        const baseChance = hasQuestionMark ? 0.7 : 0.2;
        logger.debug(`Message base chance calculation: ${baseChance} (Question mark present: ${hasQuestionMark})`);
        return baseChance;
    }

    /**
     * Calculates the delay before sending a message based on the message content.
     * @param {DiscordMessage} discordMessage - The message to evaluate.
     * @returns {number} - The calculated delay in milliseconds.
     */
    calculateDelay(discordMessage) {
        const hasQuestionMark = discordMessage.getText().includes('?');
        const delay = hasQuestionMark ? 500 : 2000;
        logger.debug(`Message delay calculation: ${delay}ms (Question mark present: ${hasQuestionMark})`);
        return delay;
    }

    /**
     * Generates a response based on the content of the message using OpenAI's GPT model.
     * @param {DiscordMessage} discordMessage - The message to respond to.
     * @returns {Promise<string>} - The generated response.
     */
    async generateResponseContent(discordMessage) {
        const prompt = discordMessage.getText();
        logger.debug(`Generating response for prompt: ${prompt}`);
        const response = await this.openAiManager.generateResponse(prompt);
        logger.debug(`Generated response: ${response}`);
        return response || "Sorry, I couldn't come up with a response.";
    }

    /**
     * Validates that the provided message object is an instance of DiscordMessage.
     * @param {DiscordMessage} discordMessage - The message to validate.
     * @returns {boolean} True if the message is a valid DiscordMessage, false otherwise.
     */
    isValidMessage(discordMessage) {
        const isValid = discordMessage instanceof DiscordMessage;
        logger.debug(`Message validation result: ${isValid}`);
        return isValid;
    }
}

module.exports = MessageResponseManager;
