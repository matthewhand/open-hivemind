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
exports.sendFollowUpMessage = sendFollowUpMessage;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:sendFollowUpMessage');
/**
 * Send Follow-Up Message
 *
 * This function sends a follow-up message to a specified channel, typically used to add context or provide additional value after
 * the initial conversation. It ensures that the follow-up is relevant and timely, based on the original interaction.
 *
 * Key Features:
 * - Sends follow-up messages to enhance the conversation.
 * - Handles errors robustly, ensuring that issues are logged and can be traced.
 * - Logs detailed information about the message-sending process.
 *
 * @param {Message} originalMessage - The original message that triggered the follow-up.
 * @param {string} content - The content of the follow-up message.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
function sendFollowUpMessage(originalMessage, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = originalMessage.channel;
            yield channel.send(content);
            debug('Follow-up message sent: ' + content);
        }
        catch (error) {
            debug('Error sending follow-up message: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
