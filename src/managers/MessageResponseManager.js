const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager');
const DiscordMessage = require('../models/DiscordMessage');
const OpenAiManager = require('./OpenAiManager');

/**
 * Manages responses to messages based on specific criteria such as wakewords,
 * and schedules responses with dynamic delays using OpenAI for content generation.
 */
class MessageResponseManager {
    static instance;

    /**
     * Private constructor to initialize the MessageResponseManager with configurations.
     */
    constructor() {
        logger.debug('Initializing MessageResponseManager with configuration.');
        this.config = configurationManager.getConfig('messageResponse') || this.defaultConfig();
        
        // Convert comma-separated wakewords to an array and trim each word.
        this.config.llmWakewords = this.config.llmWakewords.split(',').map(word => word.trim());

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
     * Provides default configuration values for the MessageResponseManager.
     * @returns {Object} The default configuration settings.
     */
    defaultConfig() {
        return {
            // InterrobangBonus: Increases the base chance of replying when the message contains interrobangs (! or ?).
            interrobangBonus: 0.3,
            
            // MentionBonus: Increases the base chance of replying when the bot is directly mentioned in the message.
            mentionBonus: 0.4,
            
            // BotResponsePenalty: Decreases the chance of replying to other bots to prevent feedback loops.
            botResponsePenalty: 0.5,
            
            // MaxDelay: The maximum delay (in milliseconds) before sending a response to simulate human-like interaction.
            maxDelay: 10000,
            
            // MinDelay: The minimum delay (in milliseconds) to ensure there's always a slight pause before replying.
            minDelay: 1000,
            
            // DecayRate: Used with TimingManager to calculate the decay in response urgency over time.
            decayRate: -0.5,
            
            // LlmWakewords: Specific keywords or phrases that trigger the bot to reply, customizable via configuration.
            llmWakewords: configurationManager.getConfig('LLM_WAKE_WORDS') || '!ping',
        };
    }

    /**
     * Manages the response process for a discord message.
     * @param {DiscordMessage} discordMessage The message to respond to.
     */
    async manageResponse(discordMessage) {
        if (!this.isValidMessage(discordMessage) || discordMessage.isFromBot()) {
            logger.debug("Ignoring invalid message or message from another bot.");
            return;
        }

        const decision = await this.shouldReplyToMessage(discordMessage);
        if (!decision.shouldReply) return;

        const responseContent = await this.generateResponseContent(discordMessage);

        // Schedules the response with a calculated delay.
        this.timingManager.scheduleMessage(discordMessage.channel.id, responseContent, decision.responseDelay);
    }

    /**
     * Determines if the bot should reply to a given message.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {Promise<{shouldReply: boolean, responseDelay: number}>} Decision and delay for response.
     */
    async shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");
    
        if (!this.isValidMessage(discordMessage)) {
            logger.debug("Message is not valid.");
            return { shouldReply: false, responseDelay: 0 };
        }
        
        if (discordMessage.isFromBot()) {
            logger.debug("Message is from another bot, applying botResponsePenalty.");
            // Example of applying botResponsePenalty in decision making
        }
    
        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            logger.debug(`Base chance for reply: ${baseChance}`);
    
            const responseDelay = this.calculateDelay(discordMessage);
            logger.debug(`Calculated response delay: ${responseDelay} ms`);
    
            const decision = Math.random() < baseChance;
            logger.debug(`Decision to reply: ${decision} (Random chance: ${Math.random()}, Base chance: ${baseChance})`);
    
            return { shouldReply: decision, responseDelay };
        }
    
        logger.debug("Message did not meet criteria for reply.");
        return { shouldReply: false, responseDelay: 0 };
    }
    
    /**
     * Checks if a message meets the criteria for a reply based on wakewords.
     * @param {DiscordMessage} discordMessage The message to check.
     * @returns {boolean} True if eligible for reply, false otherwise.
     */
    isEligibleForReply(discordMessage) {
        const messageText = discordMessage.getText().trim().toLowerCase();
        return this.config.llmWakewords.some(wakeword => messageText.startsWith(wakeword.toLowerCase()));
    }

    /**
     * Calculates the base chance of replying to a message.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {number} The base chance of replying.
     */
    calculateBaseChance(discordMessage) {
        return discordMessage.getText().includes('?') ? 0.7 : 0.2;
    }

    /**
     * Calculates the delay before sending a response.
     * @param {DiscordMessage} discordMessage The message to evaluate.
     * @returns {number} The delay in milliseconds.
     */
    calculateDelay(discordMessage) {
        return discordMessage.getText().includes('?') ? 500 : 2000;
    }

    /**
     * Generates a response content for a given message.
     * @param {DiscordMessage} discordMessage The message to respond to.
     * @returns {Promise<string>} The response content.
     */
    async generateResponseContent(discordMessage) {
        // Dynamic response generation using OpenAI
        const prompt = discordMessage.getText();
        const openAiResponse = await this.openAiManager.generateResponse(prompt);
        return openAiResponse || "Sorry, I couldn't come up with a response.";
    }

    /**
     * Validates if the object is an instance of DiscordMessage.
     * @param {any} discordMessage The message to validate.
     * @returns {boolean} True if valid, false otherwise.
     */
    isValidMessage(discordMessage) {
        return discordMessage instanceof DiscordMessage;
    }
}

module.exports = MessageResponseManager;
