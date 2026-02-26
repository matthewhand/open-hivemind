"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompletion = generateCompletion;
const debug_1 = __importDefault(require("debug"));
const getLlmProvider_1 = require("@src/llm/getLlmProvider");
const debug = (0, debug_1.default)('app:generateCompletion');
/**
 * Generates a chat completion using the configured LLM provider.
 * @param prompt - The user message to process.
 * @param messages - The message history.
 * @param metadata - Metadata for the message context.
 * @returns A promise resolving to the generated completion text.
 */
async function generateCompletion(prompt, messages, metadata) {
    try {
        debug('Starting completion generation for prompt:', prompt);
        const llmProvider = (0, getLlmProvider_1.getLlmProvider)();
        if (!llmProvider.length) {
            throw new Error('No LLM providers available');
        }
        const result = await llmProvider[0].generateChatCompletion(prompt, messages, metadata);
        debug('Completion generated:', result);
        return result;
    }
    catch (error) {
        debug('Error generating completion:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}
