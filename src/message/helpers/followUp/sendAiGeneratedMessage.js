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
exports.sendAiGeneratedMessage = sendAiGeneratedMessage;
const debug_1 = __importDefault(require("debug"));
const ConfigurationManager_1 = __importDefault(require("@config/ConfigurationManager"));
const debug = (0, debug_1.default)('app:sendAiGeneratedMessage');
const configManager = ConfigurationManager_1.default.getInstance(); // Ensure configManager is instantiated
/**
 * Send AI-Generated Message
 *
 * Generates a response using OpenAiService based on a given prompt and sends it as a reply to the original message.
 *
 * @param {OpenAiService} aiManager - The OpenAI manager instance.
 * @param {Message} originalMessage - The original message that triggered the AI response.
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @returns {Promise<void>} A promise that resolves when the AI response is sent.
 */
function sendAiGeneratedMessage(aiManager, originalMessage, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // TODO: Track and pass transcribed history in future.
            const response = yield aiManager.generateChatResponse(prompt, []);
            // Validate the AI response before proceeding
            if (!response || typeof response !== 'string' || response.trim() === '') {
                debug('Invalid AI response received.');
                return;
            }
            // Reply to the original message with the AI-generated response
            yield originalMessage.reply(response);
            debug('AI-generated message sent: ' + response);
        }
        catch (error) {
            debug('Error sending AI-generated message: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
