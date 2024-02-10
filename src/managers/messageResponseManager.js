const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const {
    getLastReplyTime,
    incrementReplyCount,
    calculateDynamicFactor,
    getReplyCount,
    resetReplyCount,
    logReply
} = require('../utils/messageResponseUtils');

class messageResponseManager {
    constructor() {
        this.config = configurationManager.getConfig('deciderConfig') || {};
        this.setupConfig();
    }

    setupConfig() {
        // Initial configuration setup with defaults
        this.interrobangBonus = this.config.interrobangBonus || 0.2;
        this.mentionBonus = this.config.mentionBonus || 0.4;
        this.botResponsePenalty = this.config.botResponsePenalty || 0.6;
        this.timeVsResponseChance = this.config.timeVsResponseChance || [[12345, 0.4], [420000, 0.6], [4140000, 0.2]];
        this.llmWakewords = this.config.llmWakewords || [];
        this.unsolicitedChannelCap = this.config.unsolicitedChannelCap || 5;
    }

    shouldReplyToMessage(ourUserId, message) {
        try {
            let baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
            baseChance *= calculateDynamicFactor(message.channel.id);

            if (this.isDirectlyMentioned(ourUserId, message)) {
                baseChance += this.mentionBonus;
            }

            if (message.author.bot) baseChance = Math.max(0, baseChance - this.botResponsePenalty);

            const decision = Math.random() < baseChance;
            if (decision) {
                incrementReplyCount(message.channel.id);
                if (getReplyCount(message.channel.id) >= this.unsolicitedChannelCap) {
                    resetReplyCount(message.channel.id);
                }
            }

            return decision;
        } catch (error) {
            logger.error(`[Error] in shouldReplyToMessage: ${error}`);
            return false;
        }
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const timeSinceLastSend = getLastReplyTime(message.channel.id);
        for (let [duration, chance] of this.timeVsResponseChance) {
            if (timeSinceLastSend <= duration) return chance;
        }
        return 0;
    }

    isDirectlyMentioned(ourUserId, message) {
        return message.mentions.users.has(ourUserId);
    }
}

module.exports = { messageResponseManager };
