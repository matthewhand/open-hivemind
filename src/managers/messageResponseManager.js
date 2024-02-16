const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const messageResponseUtils = require('../utils/messageResponseUtils');
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
        if (!this.isValidMessage(discordMessage)) {
            return { shouldReply: false, responseChance: 0 };
        }

        if (this.isEligibleForReply(discordMessage)) {
            const baseChance = this.calculateBaseChance(discordMessage);
            const shouldReply = Math.random() < baseChance;
            return { shouldReply, responseChance: shouldReply ? 1 : baseChance };
        }

        return { shouldReply: false, responseChance: 0 };
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
        baseChance += this.calculateBonusForMessageContent(discordMessage.getText());

        if (discordMessage.mentionsUsers()) {
            baseChance += this.mentionBonus;
        }

        if (discordMessage.isFromBot()) {
            baseChance = Math.max(0, baseChance - this.botResponsePenalty);
        }

        return baseChance;
    }

    calcBaseChanceOfUnsolicitedReply(channelId) {
        const timeSinceLastReply = messageResponseUtils.getTimeSinceLastReply(channelId);
        return this.timeVsResponseChance.reduce((acc, [duration, chance]) => {
            if (timeSinceLastReply <= duration) {
                return chance;
            }
            return acc;
        }, 0);
    }

    calculateBonusForMessageContent(messageContent) {
        let bonus = 0;
        if (messageContent.includes('!')) {
            bonus += this.interrobangBonus;
        }
        // Additional content checks can be implemented here
        return bonus;
    }
}

module.exports = new MessageResponseManager();
