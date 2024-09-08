"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLlmProvider = getLlmProvider;
const OpenAiService_1 = require("@src/integrations/openai/OpenAiService");
const debug_1 = __importDefault(require("debug"));
const llmConfig_1 = __importDefault(require("@llm/interfaces/llmConfig"));
const debug = (0, debug_1.default)('app:getLlmProvider');
/**
 * Get LLM Provider
 *
 * Determines and returns the appropriate LLM provider singleton based on the
 * configuration specified in the convict-based llmConfig. Supports multiple LLM
 * providers, such as OpenAI.
 *
 * @returns The singleton instance of the configured LLM provider.
 * @throws An error if the configured LLM provider is unsupported.
 */
function getLlmProvider() {
    // Fix: Ensure llmConfig uses Convict's get() method
    const llmProvider = llmConfig_1.default.get('LLM_PROVIDER');
    // Improvement: Log the selected provider for better traceability
    debug('Configured LLM provider:', llmProvider);
    // Guard: Ensure the LLM provider is specified
    if (!llmProvider) {
        throw new Error('LLM_PROVIDER is not configured.');
    }
    // Return the appropriate LLM provider based on configuration
    switch (llmProvider.toLowerCase()) {
        case 'openai':
            return OpenAiService_1.OpenAiService.getInstance(); // Assuming OpenAiService is a singleton
        // Add additional cases for other providers here
        default:
            throw new Error(`Unsupported LLM provider: ${llmProvider}`);
    }
}
