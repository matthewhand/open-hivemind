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
exports.generateChatResponse = generateChatResponse;
const openai_1 = require("openai");
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:generateChatResponse');
/**
 * Generates a chat response from OpenAI's GPT model.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @returns {Promise<string>} - The generated chat response.
 */
function generateChatResponse(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const model = openaiConfig_1.default.get('OPENAI_MODEL') || 'gpt-3.5-turbo';
            const apiKey = openaiConfig_1.default.get('OPENAI_API_KEY');
            if (!apiKey) {
                throw new Error('API key for OpenAI is missing.');
            }
            debug('Generating chat response for prompt: ' + prompt);
            const openai = new openai_1.OpenAI({ apiKey });
            const response = yield openai.chat.completions.create({
                model,
                messages: [{ role: 'user', content: prompt }],
            });
            // Ensure response is valid and return trimmed content, fallback to empty string if null
            if (!response || !response.choices || !response.choices[0]) {
                throw new Error('Failed to generate chat response. No choices returned.');
            }
            const content = ((_b = (_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            if (!content) {
                debug('Generated response was empty.');
            }
            return content;
        }
        catch (error) {
            debug('Error generating chat response: ' + error.message);
            throw error;
        }
    });
}
