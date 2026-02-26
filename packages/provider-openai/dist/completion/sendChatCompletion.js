"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChatCompletion = sendChatCompletion;
const openai_1 = require("openai");
const debug_1 = __importDefault(require("debug"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:sendChatCompletion');
/**
 * Sends a chat completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the chat completion.
 * @returns {Promise<string>} - The generated chat response.
 */
async function sendChatCompletion(messages) {
    const openai = new openai_1.OpenAI({ apiKey: openaiConfig_1.default.get('OPENAI_API_KEY') });
    // Format messages as a single prompt
    const prompt = messages.map(msg => msg.content).join(' ');
    debug(`Generated prompt: ${prompt}`);
    try {
        const response = await openai.completions.create({
            model: openaiConfig_1.default.get('OPENAI_MODEL'),
            prompt,
            max_tokens: openaiConfig_1.default.get('OPENAI_MAX_TOKENS'),
        });
        if (!response.choices || !response.choices.length) {
            throw new Error('No response from OpenAI');
        }
        const result = response.choices[0].text.trim();
        debug('Generated chat completion:', result);
        return result;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error generating chat completion:', errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('OpenAI chat completion error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to generate chat completion: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'OPENAI_CHAT_COMPLETION_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
