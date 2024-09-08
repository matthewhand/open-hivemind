"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowUp = void 0;
const debug_1 = __importDefault(require("debug"));
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
const sendFollowUp = (message, followUpText) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!message || !followUpText) {
            throw new Error('Invalid message or follow-up text provided');
        }
        debug('Sending follow-up message to channel: ' + message.channel.id);
        yield message.channel.send(followUpText);
        debug('Follow-up message sent successfully');
    }
    catch (error) {
        debug('Error sending follow-up message: ' + error.message);
        throw error;
    }
});
exports.sendFollowUp = sendFollowUp;
