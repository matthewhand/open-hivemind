import Debug from "debug";

const debug = Debug('app:messageResponseUtils');

/**
 * Message Response Utilities
 *
 * This module provides utility functions for managing and logging message responses within a channel. 
 * It tracks reply metrics such as the time since the last reply, the total reply count, and calculates dynamic factors based on activity.
 *
 * Key Features:
 * - Logs replies to track when the last reply was sent and the total count of replies in a channel.
 * - Calculates dynamic factors to adjust behavior based on channel activity.
 * - Provides functions to retrieve reply metrics, such as the time since the last reply and the reply count.
 * - Includes detailed logging with `debug` to facilitate monitoring and troubleshooting.
 */

class ReplyManager {
    private replyMetrics: Record<string, { lastReplyTime: number; replyCount: number }> = {};

    /**
     * Logs a reply in a specific channel and updates the reply metrics.
     * @param channelId - The ID of the channel where the reply was sent.
     */
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

    /**
     * Gets the time elapsed since the last reply was sent in a specific channel.
     * @param channelId - The ID of the channel to check.
     * @returns The time (in milliseconds) since the last reply, or Infinity if no reply was logged.
     */
    getTimeSinceLastReply(channelId: string): number {
        if (!this.replyMetrics[channelId]) return Infinity;
        return Date.now() - this.replyMetrics[channelId].lastReplyTime;
    }

    /**
     * Gets the total number of replies sent in a specific channel.
     * @param channelId - The ID of the channel to check.
     * @returns The total count of replies sent in the channel.
     */
    getReplyCount(channelId: string): number {
        return this.replyMetrics[channelId]?.replyCount || 0;
    }

    /**
     * Resets the reply count for a specific channel to zero.
     * @param channelId - The ID of the channel where the reply count should be reset.
     */
    resetReplyCount(channelId: string): void {
        if (this.replyMetrics[channelId]) this.replyMetrics[channelId].replyCount = 0;
    }

    /**
     * Calculates a dynamic factor based on the reply activity in a specific channel.
     * @param channelId - The ID of the channel to calculate the factor for.
     * @returns A dynamic factor that decreases as reply activity increases.
     */
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
