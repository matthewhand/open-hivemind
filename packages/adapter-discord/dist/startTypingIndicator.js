"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTyping = sendTyping;
/**
 * sendTyping - Starts and maintains typing indicators in a Discord channel at regular intervals.
 *
 * The typing indicator is sent every 15 seconds to simulate activity while the bot processes commands.
 * Debugging is included to track the channel details, typing loop initiation, and termination.
 * Guards ensure that only valid channels and typing methods are used.
 *
 * @param {Channel} channel - The Discord channel where the typing indicator will be shown.
 * @param {Function} stopCondition - A function that returns a boolean indicating whether to stop the typing indicator.
 */
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:sendTyping');
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
 * @param stopCondition - A function that stops the typing indicator when returning true.
 * @returns A NodeJS.Timeout object that can be used to clear the interval, or null if the channel is invalid.
 */
function sendTyping(channel, stopCondition) {
    if (!channel || typeof channel.sendTyping !== 'function') {
        debug('Invalid channel object provided.');
        return null;
    }
    console.debug('Typing loop started for channel: ' + channel.id);
    const typingInterval = setInterval(() => {
        if (stopCondition()) {
            clearInterval(typingInterval);
            debug('Typing indicator stopped.');
            return;
        }
        console.debug('Sending typing indicator to channel: ' + channel.name + ' (ID: ' + channel.id + ')');
        channel.sendTyping();
        debug('Typing indicator sent.');
    }, 15000);
    console.debug('Sending typing indicator to channel: ' + channel.name + ' (ID: ' + channel.id + ')');
    channel.sendTyping();
    debug('sendTyping: Interval started');
    return typingInterval;
}
