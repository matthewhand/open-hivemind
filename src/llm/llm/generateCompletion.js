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
exports.sendCompletions = sendCompletions;
const debug_1 = __importDefault(require("debug"));
const openai_1 = require("openai");
const debug = (0, debug_1.default)('app:sendCompletions');
/**
 * Sends a completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the completion.
 * @returns {Promise<string>} - The generated response.
 */
function sendCompletions(messages) {
    return __awaiter(this, void 0, void 0, function* () {
        const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Fix: Ensure messages follow the correct format
        const prompt = messages.map(msg => msg.content).join(' ');
        debug(`Generated prompt: ${prompt}`);
        try {
            const response = yield openai.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                prompt,
                max_tokens: 150,
            });
            if (!response.choices || !response.choices.length) {
                throw new Error('No response from OpenAI');
            }
            const result = response.choices[0].text.trim();
            debug('Generated completion:', result);
            return result;
        }
        catch (error) {
            debug('Error sending completion:', error.message);
            throw new Error(`Failed to send completion: ${error.message}`);
        }
    });
}
