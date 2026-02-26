"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowUp = void 0;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:sendFollowUp');
/**
 * Send Follow-Up Message
 *
 * This module handles sending follow-up messages in response to an initial interaction.
 * It ensures the follow-up message is sent correctly and logs the action for debugging purposes.
 *
 * Key Features:
 * - Sends follow-up messages after an initial interaction
 * - Handles message formatting and sending
 * - Provides detailed logging for troubleshooting
 */
/**
 * Sends a follow-up message in the Discord channel.
 * @param message - The original message from the user.
 * @param followUpText - The follow-up text to send.
 * @returns A promise that resolves when the follow-up message is sent.
 */
const sendFollowUp = async (message, followUpText) => {
    try {
        if (!message || !followUpText) {
            throw errors_1.ErrorUtils.createError('Invalid message or follow-up text provided', 'ValidationError', 'DISCORD_INVALID_FOLLOWUP_PARAMS', 400, { hasMessage: !!message, hasFollowUpText: !!followUpText });
        }
        debug('Sending follow-up message to channel: ' + message.channel.id);
        if (!(message.channel instanceof discord_js_1.TextChannel || message.channel instanceof discord_js_1.DMChannel)) {
            throw new Error('Unsupported channel type for send method.');
        }
        await message.channel.send(followUpText);
        debug('Follow-up message sent successfully');
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error sending follow-up message: ' + errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord send follow-up error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to send follow-up: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_SEND_FOLLOWUP_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
};
exports.sendFollowUp = sendFollowUp;
