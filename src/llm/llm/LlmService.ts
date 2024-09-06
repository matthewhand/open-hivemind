import { OpenAI } from 'openai';
import Debug from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';

const debug = Debug('app:LlmService');

/**
 * Generates a chat completion using OpenAI's Completion API.
 * @param {string} prompt - The prompt to generate a completion for.
 * @returns {Promise<string>} - The generated completion.
 */
export async function generateCompletion(prompt: string): Promise<string> {
    const openai = new OpenAI({ apiKey: llmConfig.get<string>('LLM_API_KEY')! });

    const messages = [{ role: 'user', content: prompt }];

    const response = await openai.chat.completions.create({
        model: llmConfig.get<string>('LLM_MODEL')!,
        messages,
        max_tokens: llmConfig.get<number>('LLM_MAX_TOKENS')!,
        temperature: llmConfig.get<number>('LLM_TEMPERATURE')!
    });

    if (!response.choices || response.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI API.');
    }

    const completion = response.choices[0].message?.content?.trim() ?? '';
    debug('Generated completion:', completion);
    return completion;
}
