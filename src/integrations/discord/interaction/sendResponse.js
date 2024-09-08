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
exports.sendResponse = void 0;
const debug_1 = __importDefault(require("debug"));
const splitMessage_1 = require("@src/message/helpers/processing/splitMessage");
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
const sendResponse = (message, responseText) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!message || !responseText) {
            throw new Error('Invalid message or response text provided');
        }
        const responseParts = (0, splitMessage_1.splitMessage)(responseText);
        for (const part of responseParts) {
            yield message.channel.send(part);
        }
        debug('Response message sent successfully: ' + responseText);
    }
    catch (error) {
        debug('Error sending response message: ' + error.message);
        throw error;
    }
});
exports.sendResponse = sendResponse;
