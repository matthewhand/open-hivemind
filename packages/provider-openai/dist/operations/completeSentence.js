"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeSentence = completeSentence;
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:completeSentence');
/**
 * Completes a sentence using the OpenAI API.
 *
 * @param client - The OpenAiService instance.
 * @param content - The content to complete.
 * @returns The completed sentence.
 */
async function completeSentence(client, content) {
    var _a;
    try {
        // Using generateChatCompletion to get the completion
        const response = await client.generateChatCompletion(content, []);
        // Ensure response is valid and trim any extra whitespace
        const trimmedResponse = (_a = response === null || response === void 0 ? void 0 : response.text) === null || _a === void 0 ? void 0 : _a.trim();
        if (trimmedResponse) {
            return trimmedResponse;
        }
        else {
            debug('Empty or invalid response received.');
            return ''; // Return an empty string if no valid response
        }
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error completing sentence:', errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('OpenAI sentence completion error:', hivemindError);
        }
        return ''; // Return an empty string in case of failure
    }
}
