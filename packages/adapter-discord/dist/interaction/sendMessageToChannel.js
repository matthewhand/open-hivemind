"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToChannel = sendMessageToChannel;
const debug_1 = __importDefault(require("debug"));
const errorClasses_1 = require("@src/types/errorClasses");
const debug = (0, debug_1.default)('app:sendMessageToChannel');
/**
 * Sends a message to a specific Discord channel.
 *
 * This function retrieves the channel by its ID, sends the specified message content to the channel, and logs the process.
 * It includes error handling to log and manage any issues that occur during message sending.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param messageContent - The content of the message to be sent.
 * @returns {Promise<Message | void>} The sent message object or void if an error occurs.
 */
async function sendMessageToChannel(client, channelId, messageContent) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        debug('Channel with ID ' + channelId + ' not found.');
        return;
    }
    try {
        const sentMessage = await channel.send(messageContent);
        debug('Message sent to channel ID ' + channelId + ': ' + messageContent);
        return sentMessage;
    }
    catch (error) {
        const networkError = new errorClasses_1.NetworkError(`Failed to send message to channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`, undefined, undefined, { originalError: error });
        debug('Network error sending message to channel ID ' + channelId + ': ' + networkError.message);
        console.error('Discord send message to channel network error:', networkError);
        // Note: This function previously didn't throw on error, just logged it
        // Maintaining that behavior for backward compatibility
    }
}
