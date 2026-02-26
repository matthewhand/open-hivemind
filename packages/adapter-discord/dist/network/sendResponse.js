"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = void 0;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const errorClasses_1 = require("@src/types/errorClasses");
const debug = (0, debug_1.default)('app:sendResponse');
/**
 * Send Response
 *
 * This module handles sending responses in the Discord channel after processing a request.
 * It formats the response, sends it, and logs the interaction for later review.
 *
 * Key Features:
 * - Sends formatted responses to the Discord channel
 * - Supports various types of response content
 * - Provides comprehensive logging for response handling
 */
/**
 * Sends a response message in the Discord channel.
 * @param message - The original message from the user.
 * @param responseText - The response text to send.
 * @returns A promise that resolves when the response message is sent.
 */
const sendResponse = async (message, responseText) => {
    try {
        if (!message || !responseText) {
            throw new errorClasses_1.ValidationError('Invalid message or response text provided', 'DISCORD_INVALID_RESPONSE_PARAMS', { hasMessage: !!message, hasResponseText: !!responseText });
        }
        debug('Sending response message to channel: ' + message.channel.id);
        if (!(message.channel instanceof discord_js_1.TextChannel || message.channel instanceof discord_js_1.DMChannel)) {
            throw new errorClasses_1.ValidationError('Unsupported channel type for send method.', 'DISCORD_UNSUPPORTED_CHANNEL_TYPE');
        }
        await message.channel.send(responseText);
        debug('Response message sent successfully');
    }
    catch (error) {
        if (error instanceof errorClasses_1.ValidationError) {
            debug('Validation error sending response message: ' + error.message);
            console.error('Discord send response validation error:', error);
            throw error;
        }
        const networkError = new errorClasses_1.NetworkError(`Failed to send response: ${error instanceof Error ? error.message : String(error)}`, undefined, undefined, { originalError: error });
        debug('Network error sending response message: ' + networkError.message);
        console.error('Discord send response network error:', networkError);
        throw networkError;
    }
};
exports.sendResponse = sendResponse;
