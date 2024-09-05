import { OpenAI } from 'openai';
import ConfigurationManager from '@config/ConfigurationManager';
import Debug from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';

const debug = Debug('app:LlmService');
const configManager = ConfigurationManager.getInstance();

/**
 * Retrieves the LLM provider name.
 *
 * @returns {string} The LLM provider name.
 */
export function getLlmProvider(): string {
    const provider = llmConfig.get('LLM_PROVIDER'); // Fix: Corrected access to LLM_PROVIDER
    if (!provider) throw new Error('LLM_PROVIDER is not configured'); // Improvement: Add guard for missing provider
    return provider;
}

/**
 * Generates a chat completion using the LLM provider.
 *
 * @param {string} prompt - The prompt for the LLM to complete.
 * @returns {Promise<string>} - The generated completion from the LLM.
 */
export async function generateLlmCompletion(prompt: string): Promise<string> {
    const model = llmConfig.get('LLM_SYSTEM_PROMPT'); // Fix: Ensure correct access to LLM_SYSTEM_PROMPT
    const maxTokens = llmConfig.get('LLM_RESPONSE_MAX_TOKENS');
    const stopSequences = llmConfig.get('LLM_STOP');

    if (!model || !maxTokens) {
        throw new Error('LLM configuration is incomplete. Please ensure model and token limits are set.'); // Improvement: Error details
    }

    const openai = new OpenAI({
        apiKey: llmConfig.get('LLM_PROVIDER'), // Fix: Ensure proper retrieval of API key
    });

    try {
        const response = await openai.completions.create({
            model,
            prompt,
            max_tokens: maxTokens,
            stop: stopSequences,
        });

        if (!response || !response.data || !response.data.choices) {
            throw new Error('Invalid response from OpenAI');
        }

        return response.data.choices[0].text.trim();
    } catch (error: any) {
        debug('Error generating LLM completion:', error);
        throw new Error(`Failed to generate LLM completion: ${error.message}`);
    }
}
