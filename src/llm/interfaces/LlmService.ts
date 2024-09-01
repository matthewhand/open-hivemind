import { OpenAI } from 'openai';
import ConfigurationManager from '@config/ConfigurationManager';
import Debug from 'debug';

const debug = Debug('app:LlmService');
const configManager = ConfigurationManager.getInstance();

interface LlmConfig {
    LLM_PROVIDER?: string;
    LLM_SYSTEM_PROMPT?: string;
    LLM_RESPONSE_MAX_TOKENS?: number;
    LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION?: boolean;
    LLM_STOP?: string[];
}

const llmConfig = configManager.getConfig('llmConfig') as LlmConfig;

if (!llmConfig) {
    throw new Error('LLM configuration is missing or incomplete.');
}

/**
 * Retrieves the LLM provider name.
 *
 * @returns {string} The LLM provider name.
 */
export function getLlmProvider(): string {
    return llmConfig.LLM_PROVIDER || 'default-provider';
}

/**
 * Generates a chat completion using the LLM provider.
 *
 * @param {string} prompt - The prompt for the LLM to complete.
 * @returns {Promise<string>} - The generated completion from the LLM.
 */
export async function generateLlmCompletion(prompt: string): Promise<string> {
    if (!llmConfig.LLM_PROVIDER || !llmConfig.LLM_SYSTEM_PROMPT || !llmConfig.LLM_RESPONSE_MAX_TOKENS) {
        throw new Error('LLM provider configuration is incomplete. Please ensure all required configurations are set.');
    }

    const openai = new OpenAI({
        apiKey: llmConfig.LLM_PROVIDER,
    });

    try {
        const response = await openai.completions.create({
            model: llmConfig.LLM_SYSTEM_PROMPT,
            prompt,
            max_tokens: llmConfig.LLM_RESPONSE_MAX_TOKENS,
            stop: llmConfig.LLM_STOP,
        });

        debug('Generated LLM completion for prompt:', prompt, 'Completion:', response.data.choices[0].text.trim());
        return response.data.choices[0].text.trim();
    } catch (error: any) {
        debug('Error generating LLM completion:', error);
        throw new Error(`Failed to generate LLM completion: ${error.message}`);
    }
}
