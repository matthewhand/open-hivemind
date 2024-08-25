class ReplyManager {
    private replyMetrics: Record<string, { lastReplyTime: number; replyCount: number }> = {};
    logReply(channelId: string): void {
        const currentTime = Date.now();
        if (!this.replyMetrics[channelId]) {
            this.replyMetrics[channelId] = { lastReplyTime: currentTime, replyCount: 1 };
        } else {
            this.replyMetrics[channelId].lastReplyTime = currentTime;
            this.replyMetrics[channelId].replyCount += 1;
        }
        debug('Logged reply for channel ' + channelId + ' at ' + currentTime);
    }
    getTimeSinceLastReply(channelId: string): number {
        if (!this.replyMetrics[channelId]) return Infinity;
        return Date.now() - this.replyMetrics[channelId].lastReplyTime;
    }
    getReplyCount(channelId: string): number {
        return this.replyMetrics[channelId]?.replyCount || 0;
    }
    resetReplyCount(channelId: string): void {
        if (this.replyMetrics[channelId]) this.replyMetrics[channelId].replyCount = 0;
    }
    calculateDynamicFactor(channelId: string): number {
        const replyCount = this.getReplyCount(channelId);
        if (replyCount > 20) return 0.3;
        if (replyCount > 10) return 0.6;
        return 1; // Default factor for low to moderate activity
    }
}
const replyManagerInstance = new ReplyManager();
export const getTimeSinceLastReply = (channelId: string): number => replyManagerInstance.getTimeSinceLastReply(channelId);
export const logReply = (channelId: string): void => replyManagerInstance.logReply(channelId);
export const calculateDynamicFactor = (channelId: string): number => replyManagerInstance.calculateDynamicFactor(channelId);
export const getReplyCount = (channelId: string): number => replyManagerInstance.getReplyCount(channelId);
export const resetReplyCount = (channelId: string): void => replyManagerInstance.resetReplyCount(channelId);
