const configurationManager = require('../config/configurationManager');
const logger = require('./logger');

class ReplyManager {
    constructor() {
        // Initializes storage for tracking replies and message activity per channel
        this.replyMetrics = {};
    }

    logReply(channelId) {
        const currentTime = Date.now();
        if (!this.replyMetrics[channelId]) {
            this.replyMetrics[channelId] = { lastReplyTime: currentTime, replyCount: 1 };
        } else {
            this.replyMetrics[channelId].lastReplyTime = currentTime;
            this.replyMetrics[channelId].replyCount += 1;
        }
        logger.info(`Logged reply for channel ${channelId} at ${currentTime}`);
    }

    getTimeSinceLastReply(channelId) {
        if (!this.replyMetrics[channelId]) return Infinity;
        return Date.now() - this.replyMetrics[channelId].lastReplyTime;
    }

    getReplyCount(channelId) {
        return this.replyMetrics[channelId]?.replyCount || 0;
    }

    resetReplyCount(channelId) {
        if (this.replyMetrics[channelId]) this.replyMetrics[channelId].replyCount = 0;
    }

    calculateDynamicFactor(channelId) {
        const replyCount = this.getReplyCount(channelId);
        if (replyCount > 20) return 0.3;
        if (replyCount > 10) return 0.6;
        return 1; // Default factor for low to moderate activity
    }
}

const replyManagerInstance = new ReplyManager();

module.exports = {
    getTimeSinceLastReply: channelId => replyManagerInstance.getTimeSinceLastReply(channelId),
    logReply: channelId => replyManagerInstance.logReply(channelId),
    calculateDynamicFactor: channelId => replyManagerInstance.calculateDynamicFactor(channelId),
    getReplyCount: channelId => replyManagerInstance.getReplyCount(channelId),
    resetReplyCount: channelId => replyManagerInstance.resetReplyCount(channelId),
};
