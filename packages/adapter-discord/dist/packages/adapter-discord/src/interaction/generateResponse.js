"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:generateResponse');
/**
 * Generates an AI response for a given message.
 * @param {string} transcript - The transcript of the message to generate a response to.
 * @returns {Promise<string>} A promise that resolves to the generated response.
 */
async function generateResponse(transcript) {
    try {
        // Placeholder for actual response generation logic
        const response = `AI-generated response for: ${transcript}`;
        debug('Generated response: ' + response);
        return response;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error generating response: ' + errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord generate response error:', hivemindError);
        }
        return 'Sorry, an error occurred while generating a response.';
    }
}
