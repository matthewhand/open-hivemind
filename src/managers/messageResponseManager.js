const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const messageResponseUtils = require('../utils/messageResponseUtils.js');
const constants = require('../config/constants');
const DiscordMessage = require('../models/DiscordMessage');

class MessageResponseManager {
    constructor() {
        logger.debug('Initializing MessageResponseManager with default configuration.');
        this.config = configurationManager.getConfig('messageResponse') || this.defaultConfig();
        this.setupConfig();
    }

    defaultConfig() {
        return {
            interrobangBonus: 0.2,
            mentionBonus: 0.4,
            botResponsePenalty: 0.6,
            timeVsResponseChance: [[12345, 0.4], [420000, 0.6], [4140000, 0.2]],
            llmWakewords: [],
            unsolicitedChannelCap: 5,
        };
    }

    setupConfig() {
        this.interrobangBonus = this.config.interrobangBonus;
        this.mentionBonus = this.config.mentionBonus;
        this.botResponsePenalty = this.config.botResponsePenalty;
        this.timeVsResponseChance = this.config.timeVsResponseChance;
        this.llmWakewords = this.config.llmWakewords;
        this.unsolicitedChannelCap = this.config.unsolicitedChannelCap;
    }
    shouldReplyToMessage(discordMessage) {
        logger.debug("Evaluating if the bot should reply to the message...");
    
        if (!this.isValidMessage(discordMessage)) {
            logger.debug("Message is not valid.");
            return { shouldReply: false, responseChance: 0 };
        } else {
            logger.debug("Message is valid.");
        }
    
        if (this.isEligibleForReply(discordMessage)) {
            logger.debug("Message is eligible for a reply. Calculating base chance...");
            const baseChance = this.calculateBaseChance(discordMessage);
            logger.debug(`Base chance calculated: ${baseChance}`);
    
            const shouldReply = Math.random() < baseChance;
            logger.debug(`Random decision: ${shouldReply ? 'Replying' : 'Not replying'} (Random < Base Chance: ${Math.random()} < ${baseChance})`);
    
            return { shouldReply, responseChance: shouldReply ? 1 : baseChance };
        } else {
            logger.debug("Message is not eligible for a reply.");
            return { shouldReply: false, responseChance: 0 };
        }
    }
    
    isValidMessage(discordMessage) {
        if (!(discordMessage instanceof DiscordMessage)) {
            logger.debug('Invalid message object type.');
            return false;
        }
        return true;
    }

    isEligibleForReply(discordMessage) {
        const channelId = discordMessage.getChannelId();
        return discordMessage.mentionsUsers() || discordMessage.isReply() || channelId === constants.CHANNEL_ID;
    }

    calculateBaseChance(discordMessage) {
        let baseChance = this.calcBaseChanceOfUnsolicitedReply(discordMessage.getChannelId());
        logger.debug(`Initial base chance based on time since last reply: ${baseChance}`);

        const bonusFromContent = this.calculateBonusForMessageContent(discordMessage.getText());
        baseChance += bonusFromContent;
        logger.debug(`Bonus from message content: ${bonusFromContent}, updated base chance: ${baseChance}`);

        if (discordMessage.mentionsUsers()) {
            baseChance += this.mentionBonus;
            logger.debug(`Added mention bonus: ${this.mentionBonus}, updated base chance: ${baseChance}`);
        }

        if (discordMessage.isFromBot()) {
            // Apply a stronger penalty if the message is from a bot to make it less likely to respond
            baseChance *= (1 - this.botResponsePenalty); // Changed from subtraction to multiplication for a stronger effect
            logger.debug(`Applied bot response penalty: ${this.botResponsePenalty}, updated base chance: ${baseChance}`);
        }

        // Ensure the base chance does not exceed 1 or drop below 0
        baseChance = Math.min(Math.max(baseChance, 0), 1);

        return baseChance;
    }

    calcBaseChanceOfUnsolicitedReply(channelId) {
        const timeSinceLastReply = messageResponseUtils.getTimeSinceLastReply(channelId);
        logger.debug(`Time since last reply for channel ${channelId}: ${timeSinceLastReply}ms`);

        if (timeSinceLastReply === Infinity) {
            logger.debug("No previous replies detected. Setting base chance to 1.00.");
            return 1.00;
        }

        // Find the first matching time threshold that is greater than or equal to timeSinceLastReply
        // and use its corresponding chance
        const matchedThreshold = this.timeVsResponseChance.find(([duration, _]) => timeSinceLastReply <= duration);
        const chance = matchedThreshold ? matchedThreshold[1] : 0;

        logger.debug(`Calculated base chance of unsolicited reply based on duration: ${chance}`);
        return chance;
    }
    
    calculateBonusForMessageContent(messageContent) {
        let bonus = 0;
        if (messageContent.includes('!')) {
            bonus += this.interrobangBonus;
            logger.debug(`Content contains '!', adding interrobang bonus: ${this.interrobangBonus}`);
        }
        // Implement additional content checks here, logging as necessary
        return bonus;
    }
}

module.exports = new MessageResponseManager();
