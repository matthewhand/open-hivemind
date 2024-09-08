"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialDelay = getInitialDelay;
const debug_1 = __importDefault(require("debug"));
const timestampFunctions_1 = require("./timestampFunctions");
const debug = (0, debug_1.default)('app:getInitialDelay');
/**
 * Calculates the initial delay before sending a message based on recent activity in the channel.
 * This delay simulates the bot 'reading' the previous messages before responding, providing a more natural interaction.
 *
 * Key Features:
 * - Considers the time since the last typing activity in the channel.
 * - Dynamically adjusts the delay within a specified range (minDelay to maxDelay).
 * - Logs important steps, such as the time since the last activity and the calculated delay.
 *
 * @param typingTimestamps - A map storing the last typing timestamps for channels.
 * @param channelId - The ID of the channel where the message will be sent.
 * @param minDelay - The minimum delay before responding (in milliseconds).
 * @param maxDelay - The maximum delay before responding (in milliseconds).
 * @returns {number} The calculated delay time (in milliseconds).
 */
function getInitialDelay(typingTimestamps, channelId, minDelay = 1000, maxDelay = 5000) {
    const lastTyping = (0, timestampFunctions_1.getLastTypingTimestamp)(typingTimestamps, channelId);
    const timeSinceLastTyping = Date.now() - lastTyping;
    debug('[getInitialDelay] Time since last typing in channel ' + channelId + ': ' + timeSinceLastTyping + 'ms.');
    // Calculate delay proportionally between minDelay and maxDelay based on timeSinceLastTyping
    const delay = Math.min(maxDelay, Math.max(minDelay, timeSinceLastTyping));
    debug('[getInitialDelay] Calculated delay for channel ' + channelId + ': ' + delay + 'ms.');
    return delay;
}
