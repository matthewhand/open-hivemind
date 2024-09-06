import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import Debug from 'debug';
import { OpenAI } from 'openai';

const debug = Debug('app:sendChatCompletion');

/**
 * Sends a chat completion request to OpenAI's API.
 * @param {Array<{ role: string, content: string }>} messages - The history of conversation messages.
 * @param {string} model - The model to use for the completion.
 * @param {number} maxTokens - The maximum number of tokens.
 * @returns {Promise<string>} - The generated completion text.
 */
export async function sendChatCompletion(
    messages: { role: string; content: string }[],
    model: string = openaiConfig.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
    maxTokens: number = openaiConfig.get<number>('OPENAI_MAX_TOKENS', 100)
): Promise<string> {
    const openai = new OpenAI({ apiKey: openaiConfig.get('OPENAI_API_KEY') });
    debug(`Sending chat completion with model: ${model}`);

    const response = await openai.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get('OPENAI_TEMPERATURE', 0.7)
    });

    if (!response.choices || response.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI API.');
    }

    return response.choices[0].message?.content?.trim() || '';
}
