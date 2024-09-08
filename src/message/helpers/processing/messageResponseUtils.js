"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetReplyCount = exports.getReplyCount = exports.calculateDynamicFactor = exports.logReply = exports.getTimeSinceLastReply = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:messageResponseUtils');
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
    constructor() {
        this.replyMetrics = {};
    }
    /**
     * Logs a reply in a specific channel and updates the reply metrics.
     * @param channelId - The ID of the channel where the reply was sent.
     */
    logReply(channelId) {
        const currentTime = Date.now();
        if (!this.replyMetrics[channelId]) {
            this.replyMetrics[channelId] = { lastReplyTime: currentTime, replyCount: 1 };
        }
        else {
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
    getTimeSinceLastReply(channelId) {
        if (!this.replyMetrics[channelId])
            return Infinity;
        return Date.now() - this.replyMetrics[channelId].lastReplyTime;
    }
    /**
     * Gets the total number of replies sent in a specific channel.
     * @param channelId - The ID of the channel to check.
     * @returns The total count of replies sent in the channel.
     */
    getReplyCount(channelId) {
        var _a;
        return ((_a = this.replyMetrics[channelId]) === null || _a === void 0 ? void 0 : _a.replyCount) || 0;
    }
    /**
     * Resets the reply count for a specific channel to zero.
     * @param channelId - The ID of the channel where the reply count should be reset.
     */
    resetReplyCount(channelId) {
        if (this.replyMetrics[channelId])
            this.replyMetrics[channelId].replyCount = 0;
    }
    /**
     * Calculates a dynamic factor based on the reply activity in a specific channel.
     * @param channelId - The ID of the channel to calculate the factor for.
     * @returns A dynamic factor that decreases as reply activity increases.
     */
    calculateDynamicFactor(channelId) {
        const replyCount = this.getReplyCount(channelId);
        if (replyCount > 20)
            return 0.3;
        if (replyCount > 10)
            return 0.6;
        return 1; // Default factor for low to moderate activity
    }
}
const replyManagerInstance = new ReplyManager();
const getTimeSinceLastReply = (channelId) => replyManagerInstance.getTimeSinceLastReply(channelId);
exports.getTimeSinceLastReply = getTimeSinceLastReply;
const logReply = (channelId) => replyManagerInstance.logReply(channelId);
exports.logReply = logReply;
const calculateDynamicFactor = (channelId) => replyManagerInstance.calculateDynamicFactor(channelId);
exports.calculateDynamicFactor = calculateDynamicFactor;
const getReplyCount = (channelId) => replyManagerInstance.getReplyCount(channelId);
exports.getReplyCount = getReplyCount;
const resetReplyCount = (channelId) => replyManagerInstance.resetReplyCount(channelId);
exports.resetReplyCount = resetReplyCount;
