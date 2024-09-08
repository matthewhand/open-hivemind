"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTypingIndicator = startTypingIndicator;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:startTypingIndicator');
/**
 * Utility to Start a Typing Indicator in a Discord Channel
 *
 * This function initiates a typing indicator in a specified Discord channel, which refreshes every 15 seconds.
 * It's useful for signaling to users that the bot is processing a request and will send a message soon.
 *
 * Key Features:
 * - Ensures the channel object is valid before attempting to send a typing indicator.
 * - Automatically refreshes the typing indicator every 15 seconds to maintain the active state.
 * - Returns an interval object that can be used to stop the typing indicator when no longer needed.
 * - Logs important steps and potential issues for debugging purposes.
 *
 * @param channel - The Discord channel where the typing indicator will be shown.
 * @returns A NodeJS.Timeout object that can be used to clear the interval, or null if the channel is invalid.
 */
function startTypingIndicator(channel) {
    if (!channel || typeof channel.sendTyping !== 'function') {
        debug('Invalid channel object provided.');
        return null;
    }
    channel.sendTyping();
    const typingInterval = setInterval(() => channel.sendTyping(), 15000);
    debug('startTypingIndicator: Interval started');
    return typingInterval;
}
