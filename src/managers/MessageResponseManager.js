const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const TimingManager = require('./TimingManager'); // Ensure this supports getInstance
const DiscordMessage = require('../models/DiscordMessage');
const { getReplyCount } = require('../utils/messageHandlerUtils');

class MessageResponseManager {
    static instance;

    constructor() {
        logger.debug('Initializing MessageResponseManager with configuration.');
        this.config = configurationManager.getConfig('messageResponse') || this.defaultConfig();

        this.timingManager = TimingManager.getInstance();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new MessageResponseManager();
        }
        return this.instance;
    }

    defaultConfig() {
        return {
            interrobangBonus: 0.3,
            mentionBonus: 0.4,
            botResponsePenalty: 0.5,
            maxDelay: 10000,
            minDelay: 1000,
            decayRate: -0.5,
        };
    }

    async manageResponse(discordMessage) {
        if (!this.isValidMessage(discordMessage) || discordMessage.isFromBot()) {
            logger.debug("Ignoring invalid message or message from another bot.");
            return;
        }

        const decision = await this.shouldReplyToMessage(discordMessage);
        if (!decision.shouldReply) return;

        // Implement content generation based on the discordMessage or use predefined responses
        const responseContent = this.generateResponseContent(discordMessage);

        // Use the timingManager to schedule the sending of the response with the calculated delay
        this.timingManager.scheduleMessage(discordMessage.channel.id, responseContent, decision.responseDelay);
    }

    async shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");

        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            // Incorporate additional logic to calculate chance and delay dynamically
            return { shouldReply: Math.random() < baseChance, responseDelay: this.calculateDelay(discordMessage) };
        }
        return { shouldReply: false, responseDelay: 0 };
    }

    isEligibleForReply(discordMessage) {
        // Implement comprehensive checks to determine eligibility
        return discordMessage.getText().toLowerCase().includes('help') || discordMessage.mentionsUsers();
    }

    calculateBaseChance(discordMessage) {
        // Dynamic calculation of base chance based on message content and other factors
        return discordMessage.getText().includes('?') ? 0.7 : 0.2; // Example probabilities
    }

    calculateDelay(discordMessage) {
        // Dynamic delay calculation, potentially based on message content, time of day, etc.
        // For example, longer delays for less urgent messages
        return discordMessage.getText().includes('?') ? 500 : 2000; // Shorter delay for questions
    }

    generateResponseContent(discordMessage) {
        // Placeholder for dynamic response generation logic
        // Return a meaningful response based on the content of discordMessage
        if (discordMessage.getText().toLowerCase().includes('help')) {
            return "Here's how you can get help...";
        }
        return "Thank you for your message.";
    }

    isValidMessage(discordMessage) {
        return discordMessage instanceof DiscordMessage;
    }
}

module.exports = MessageResponseManager;
