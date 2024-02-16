// src/managers/messageResponseManager.js
const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const messageResponseUtils = require('../utils/messageResponseUtils');
const constants = require('../config/constants'); // Ensure this import is correct

class MessageResponseManager {
    constructor() {
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

    shouldReplyToMessage(message) {
        let baseChance = this.calcBaseChanceOfUnsolicitedReply(message.channel.id);
        baseChance += this.calculateBonusForMessageContent(message);

        if (message.mentions.users.has(constants.CLIENT_ID)) {
            baseChance += this.mentionBonus;
        }

        if (message.author.bot) {
            baseChance = Math.max(0, baseChance - this.botResponsePenalty);
        }

        const shouldReply = Math.random() < baseChance;
        const responseChance = shouldReply ? 1 : baseChance; // Ensure a full chance for direct replies
        
        return {
            shouldReply,
            responseChance,
        };
    }

    calcBaseChanceOfUnsolicitedReply(channelId) {
        const timeSinceLastReply = messageResponseUtils.getTimeSinceLastReply(channelId);
        for (let [duration, chance] of this.timeVsResponseChance) {
            if (timeSinceLastReply <= duration) {
                return chance;
            }
        }
        return 0;
    }

    calculateBonusForMessageContent(message) {
        let bonus = 0;
        if (message.content.includes('!')) {
            bonus += this.interrobangBonus;
        }
        // Additional content checks can be implemented here
        return bonus;
    }
}

module.exports = MessageResponseManager;
