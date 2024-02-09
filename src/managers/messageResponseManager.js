const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const {
    getLastReplyTime,
    incrementReplyCount,
    calculateDynamicFactor,
    getReplyCount,
    resetReplyCount
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
            // Validating message object
            if (!message || !message.client || !message.client.user) throw new Error('Invalid message object');

            let baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
            baseChance *= calculateDynamicFactor(message.channel.id);

            // Adjusting for direct mentions and content
            if (this.isDirectlyMentioned(ourUserId, message) || this.containsWakeWords(message)) {
                baseChance += this.mentionBonus;
            }

            // Penalizing bot messages to avoid loops
            if (message.author.bot) baseChance = Math.max(0, baseChance - this.botResponsePenalty);

            // Making the decision to reply or not
            const decision = Math.random() < baseChance;
            if (decision) {
                incrementReplyCount(message.channel.id);
                if (getReplyCount(message.channel.id) >= this.unsolicitedChannelCap) {
                    resetReplyCount(message.channel.id); // Resetting after cap is reached
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
        // Iterating through configured time vs response chance
        for (let [duration, chance] of this.timeVsResponseChance) {
            if (timeSinceLastSend <= duration) return chance;
        }
        return 0; // Defaulting to 0% if conditions aren't met
    }

    isDirectlyMentioned(ourUserId, message) {
        // Checking for direct mentions
        return message.mentions.users.has(ourUserId);
    }

    containsWakeWords(message) {
        // Checking for wake words in message content
        return this.llmWakewords.some(wakeword => message.content.toLowerCase().includes(wakeword.toLowerCase()));
    }
}

module.exports = { messageResponseManager };
