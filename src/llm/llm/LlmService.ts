import { OpenAI, CompletionCreateParams } from 'openai';
import Debug from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';

const debug = Debug('app:LlmService');

/**
 * Generates a completion using OpenAI's Completion API.
 * 
 * @param {string} prompt - The prompt to generate a completion for.
 * @returns {Promise<string>} - The generated completion.
 */
export async function generateCompletion(prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey: llmConfig.get('LLM_API_KEY') });

    const response = await openai.completions.create({
        model: llmConfig.get('LLM_MODEL', 'gpt-3.5-turbo'),
        prompt,
        max_tokens: llmConfig.get<number>('LLM_MAX_TOKENS', 100),
        temperature: llmConfig.get<number>('LLM_TEMPERATURE', 0.7),
    } as CompletionCreateParams);

    if (!response.choices || response.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI API.');
    }

    const completion = response.choices[0].text.trim();
    debug('Generated completion:', completion);
    return completion;
}
