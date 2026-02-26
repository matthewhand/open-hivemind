"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = void 0;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const splitMessageContent_1 = require("@src/message/helpers/processing/splitMessageContent");
const errors_1 = require("@src/types/errors");
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
            throw errors_1.ErrorUtils.createError('Invalid message or response text provided', 'ValidationError', 'DISCORD_INVALID_RESPONSE_PARAMS', 400, { hasMessage: !!message, hasResponseText: !!responseText });
        }
        const responseParts = (0, splitMessageContent_1.splitMessageContent)(responseText);
        for (const part of responseParts) {
            if (!(message.channel instanceof discord_js_1.TextChannel || message.channel instanceof discord_js_1.DMChannel)) {
                throw new Error('Unsupported channel type for send method.');
            }
            await message.channel.send(part);
        }
        debug('Response message sent successfully: ' + responseText);
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error sending response message: ' + errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord send response error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to send response: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_SEND_RESPONSE_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
};
exports.sendResponse = sendResponse;
