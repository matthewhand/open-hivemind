"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCompletion = sendCompletion;
const openai_1 = require("openai");
const debug_1 = __importDefault(require("debug"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:sendCompletions');
async function sendCompletion() {
    const openai = new openai_1.OpenAI({ apiKey: openaiConfig_1.default.get('OPENAI_API_KEY') });
    try {
        const response = await openai.completions.create({
            model: openaiConfig_1.default.get('OPENAI_MODEL'),
            prompt: 'Your prompt here',
            max_tokens: openaiConfig_1.default.get('OPENAI_MAX_TOKENS'),
            temperature: openaiConfig_1.default.get('OPENAI_TEMPERATURE'),
        });
        if (!response.choices || !response.choices.length) {
            throw new Error('No completion choices returned.');
        }
        debug('Completion generated:', response.choices[0].text.trim());
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error generating completion:', errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('OpenAI completion error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to generate completion: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'OPENAI_COMPLETION_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
