// utils/messageResponseUtils.js
const configurationManager = require('../config/configurationManager');
const logger = require('./logger');

class ReplyManager {
    constructor() {
        this.lastReplyTimes = {};
        this.recentMessagesCount = {};
    }

    logReply(channelId) {
        const now = Date.now();
        this.lastReplyTimes[channelId] = now;
        this.recentMessagesCount[channelId] = (this.recentMessagesCount[channelId] || 0) + 1;
        logger.info(`Logged reply for channel ${channelId} at ${now}`);
    }

    getTimeSinceLastReply(channelId) {
        return Date.now() - (this.lastReplyTimes[channelId] || 0);
    }

    shouldReply(ourUserId, message) {
        // Direct mention always triggers a reply
        if (this.isDirectlyMentioned(ourUserId, message)) {
            this.logReply(message.channel.id);
            return true;
        }

        // Unsolicited replies are controlled by a threshold
        const unsolicitedReplyThreshold = configurationManager.getConfig('unsolicitedReplyThreshold') || 300000; // Default 5 minutes
        if (this.getTimeSinceLastReply(message.channel.id) > unsolicitedReplyThreshold) {
            this.logReply(message.channel.id);
            return true;
        }

        return false;
    }

    isDirectlyMentioned(ourUserId, message) {
        // Check for direct mentions or wake words
        const wakeWords = configurationManager.getConfig('wakeWords') || [];
        return message.mentions.users.has(ourUserId) || wakeWords.some(word => message.content.includes(word));
    }

    calculateDynamicFactor(channelId) {
        // Adjust reply likelihood based on channel activity
        const messageCount = this.recentMessagesCount[channelId] || 0;
        return messageCount > 10 ? 0.5 : 1; // Reduce likelihood for active channels
    }
}

// Additional utility functions can be added here for managing replies
const ReplyManagerInstance = new ReplyManager();

function getLastReplyTime(channelId) {
    return ReplyManagerInstance.getTimeSinceLastReply(channelId);
}

function incrementReplyCount(channelId) {
    ReplyManagerInstance.logReply(channelId);
}

function calculateDynamicFactor(channelId) {
    return ReplyManagerInstance.calculateDynamicFactor(channelId);
}

function shouldConsiderReply(channelId) {
    // Logic to decide if a reply should be considered based on channel-specific conditions
    return true; // Placeholder, implement based on your requirements
}

function adjustBaseChanceForContent(message, baseChance) {
    // Logic to adjust the base chance of replying based on the content of the message
    return baseChance; // Placeholder, implement your own logic
}

module.exports = {
    getLastReplyTime,
    incrementReplyCount,
    calculateDynamicFactor,
    shouldConsiderReply,
    adjustBaseChanceForContent
};
