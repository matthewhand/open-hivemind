"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageToChannel = sendMessageToChannel;
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:sendMessageToChannel');
/**
 * Send Message to Channel
 *
 * This function handles sending a message to a specified Discord text channel. It manages the sending process, handles any
 * errors that may occur, and logs the actions for easier debugging.
 *
 * Key Features:
 * - Sends a message to the specified Discord text channel.
 * - Handles potential errors during the message sending process.
 * - Logs the success or failure of the message sending operation.
 *
 * @param {TextChannel} channel - The channel to send the message to.
 * @param {string} content - The content of the message to send.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
async function sendMessageToChannel(channel, content) {
    try {
        await channel.send(content);
        debug('Message sent to channel ' + channel.id);
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error sending message to channel: ' + errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord send message to channel error:', hivemindError);
        }
    }
}
