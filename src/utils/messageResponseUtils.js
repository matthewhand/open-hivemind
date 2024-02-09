// utils/messageResponseUtils.js
const configurationManager = require('../config/configurationManager');
const logger = require('./logger');

class ReplyManager {
    constructor() {
        // Initializes storage for tracking replies and message counts per channel
        this.lastReplyTimes = {};
        this.replyCounts = {};
    }

    // Records a reply's occurrence in a specific channel and updates the last reply time and count
    logReply(channelId) {
        const currentTime = Date.now();
        this.lastReplyTimes[channelId] = currentTime;
        this.replyCounts[channelId] = (this.replyCounts[channelId] || 0) + 1;
        logger.info(`Logged reply for channel ${channelId} at ${currentTime}`);
    }

    // Retrieves the time elapsed since the last reply in a specific channel
    getTimeSinceLastReply(channelId) {
        const lastReplyTime = this.lastReplyTimes[channelId];
        return lastReplyTime ? Date.now() - lastReplyTime : Infinity;
    }

    // Returns the number of replies sent by the bot in a specific channel
    getReplyCount(channelId) {
        return this.replyCounts[channelId] || 0;
    }

    // Resets the count of replies sent by the bot in a specific channel
    resetReplyCount(channelId) {
        this.replyCounts[channelId] = 0;
    }

/**
 * Calculates a dynamic factor for replying based on the recent activity in a channel.
 * This method adjusts the likelihood of a reply, making the bot less likely to respond
 * in very active channels to avoid flooding.
 *
 * @param {string} channelId - The ID of the Discord channel.
 * @return {number} A dynamic factor between 0 and 1, where 1 indicates no adjustment
 * to the reply likelihood and values less than 1 reduce the likelihood.
 */
calculateDynamicFactor(channelId) {
    const recentMessageCount = this.replyCounts[channelId] || 0;
    // Example thresholds and factors; customize based on desired behavior
    if (recentMessageCount > 20) {
        return 0.3; // Significantly reduce likelihood for very active channels
    } else if (recentMessageCount > 10) {
        return 0.6; // Moderately reduce likelihood for active channels
    }
    return 1; // No adjustment for channels with low to moderate activity
}

}

// Singleton pattern to ensure a single instance of ReplyManager is used application-wide
const replyManagerInstance = new ReplyManager();

// Encapsulates ReplyManager methods for external usage, providing a clear interface
function getLastReplyTime(channelId) {
    return replyManagerInstance.getTimeSinceLastReply(channelId);
}

function incrementReplyCount(channelId) {
    replyManagerInstance.logReply(channelId);
}

function getReplyCount(channelId) {
    return replyManagerInstance.getReplyCount(channelId);
}

function resetReplyCount(channelId) {
    replyManagerInstance.resetReplyCount(channelId);
}

// Exporting the updated calculateDynamicFactor function for external use
function calculateDynamicFactor(channelId) {
    return replyManagerInstance.calculateDynamicFactor(channelId);
}

module.exports = {
    getLastReplyTime,
    incrementReplyCount,
    calculateDynamicFactor,
    getReplyCount,
    resetReplyCount
};
