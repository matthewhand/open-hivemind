import { OpenAI } from 'openai';
import Debug from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';
import { ChatCompletionMessageParam } from 'openai';

const debug = Debug('app:LlmService');

/**
 * Retrieves the LLM provider name.
 * @returns {string} The LLM provider name.
 */
export function getLlmProvider(): string {
    const provider = llmConfig.get('LLM_PROVIDER');
    if (!provider) throw new Error('LLM_PROVIDER is not configured');
    return provider;
}

/**
 * Generates a chat completion using the LLM provider.
 * @param {string} prompt - The prompt for the LLM to complete.
 * @returns {Promise<string>} - The generated completion.
 */
export async function generateLlmCompletion(prompt: string): Promise<string> {
    const model = llmConfig.get('LLM_SYSTEM_PROMPT');
    const maxTokens = llmConfig.get('LLM_RESPONSE_MAX_TOKENS');
    const stopSequences = llmConfig.get('LLM_STOP');

    // Fix: Correctly type messages as ChatCompletionMessageParam[]
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];

    debug('Generating completion with model:', model);
    debug('Max tokens:', maxTokens);
    debug('Stop sequences:', stopSequences);

    if (!model || !maxTokens) {
        throw new Error('LLM configuration is incomplete. Ensure model and tokens are set.');
    }

    const openai = new OpenAI({
        apiKey: llmConfig.get('LLM_PROVIDER'),
    });

    try {
        const response = await openai.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            stop: stopSequences,
            stream: false,
        });

        if (!response || !response.choices || !Array.isArray(response.choices)) {
            throw new Error('Invalid response from OpenAI');
        }

        const resultText = response.choices[0]?.text?.trim() ?? '';
        debug('Generated completion:', resultText);
        return resultText;
    } catch (error: any) {
        debug('Error generating LLM completion:', error);
        throw new Error(`Failed to generate completion: ${error.message}`);
    }
}
