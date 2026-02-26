"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChatCompletion = generateChatCompletion;
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:OpenAiService');
/**
 * Fetch the first available OpenAI model.
 * @returns {string} - Model's ID (default is 'gpt-3.5-turbo').
 */
function getOpenAIModel() {
    return openaiConfig_1.default.get('OPENAI_MODEL') || 'gpt-3.5-turbo';
}
/**
 * Generate a chat response using OpenAI without SDK dependency.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
 * @returns {Promise<string | null>} - Chat response or null.
 */
async function generateChatCompletion(message, historyMessages, options) {
    var _a;
    try {
        debug('message:', message);
        debug('historyMessages:', historyMessages);
        debug('options:', options);
        if (!message) {
            throw new Error('No input message provided.');
        }
        if (!historyMessages || historyMessages.length === 0) {
            throw new Error('No history messages provided.');
        }
        const model = getOpenAIModel();
        const systemMessageContent = 'Initializing system context...';
        if (options.isBusy()) {
            debug('Service is busy.');
            return null;
        }
        options.setBusy(true);
        // Prepare the message payload with system, user, and history messages
        const chatParams = [
            { role: 'system', content: systemMessageContent },
            { role: 'user', content: message },
            ...historyMessages.map((msg) => ({ role: msg.role, content: msg.content, name: msg.getAuthorId() || 'unknown' })),
        ];
        // API request details
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model,
            messages: chatParams,
            temperature: openaiConfig_1.default.get('OPENAI_TEMPERATURE') || 0.7,
            max_tokens: openaiConfig_1.default.get('OPENAI_MAX_TOKENS') || 150,
        }, {
            headers: {
                Authorization: `Bearer ${openaiConfig_1.default.get('OPENAI_API_KEY')}`,
                'Content-Type': 'application/json',
            },
        });
        options.setBusy(false);
        return ((_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message.content) || null;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error:', errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level based on classification
        switch (classification.logLevel) {
            case 'error':
                console.error('OpenAI chat completion error:', hivemindError);
                break;
            case 'warn':
                console.warn('OpenAI chat completion warning:', hivemindError);
                break;
            default:
                debug('OpenAI chat completion info:', hivemindError);
        }
        options.setBusy(false);
        throw errors_1.ErrorUtils.createError(`OpenAI chat completion failed: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'OPENAI_COMPLETION_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
