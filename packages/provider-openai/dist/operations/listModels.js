"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listModels = listModels;
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:OpenAiService');
/**
 * Lists all available models from OpenAI.
 *
 * @param openai - The OpenAI API client instance.
 * @returns {Promise<any>} - The list of available models.
 */
async function listModels(openai) {
    try {
        const response = await openai.models.list();
        debug('Available models:', response.data);
        return response.data;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug('Error listing models:', errors_1.ErrorUtils.getMessage(hivemindError));
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('OpenAI list models error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to list models: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'OPENAI_LIST_MODELS_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
