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
exports.sendMessagePart = sendMessagePart;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:sendMessagePart');
/**
 * Sends a part of a message to a specified text channel.
 * @param {TextChannel} channel - The text channel to send the message to.
 * @param {string} content - The content of the message part to send.
 * @param {string} originalMessageId - The ID of the original message being followed up.
 * @returns {Promise<void>} A promise that resolves when the message part is sent.
 */
function sendMessagePart(channel, content, originalMessageId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sentMessage = yield channel.send(content);
            debug('Message part sent: ' + content + ' as reply to ' + originalMessageId);
        }
        catch (error) {
            debug('Error sending message part: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
