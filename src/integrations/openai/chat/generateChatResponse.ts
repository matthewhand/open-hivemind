import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import Debug from 'debug';

const debug = Debug('app:generateChatResponse');

/**
 * Generates a chat response from OpenAI's GPT model.
 *
 * @param {string} prompt - The prompt to generate a response for.
 * @returns {Promise<string>} - The generated chat response.
 */
export async function generateChatResponse(prompt: string): Promise<string> {
    try {
        const model = openaiConfig.get('OPENAI_MODEL') || 'gpt-3.5-turbo';
        const apiKey = openaiConfig.get('OPENAI_API_KEY');

        if (!apiKey) {
            throw new Error('API key for OpenAI is missing.');
        }

        debug('Generating chat response for prompt: ' + prompt);

        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
        });

        // Ensure response is valid and return trimmed content, fallback to empty string if null
        if (!response || !response.choices || !response.choices[0]) {
            throw new Error('Failed to generate chat response. No choices returned.');
        }

        const content = response.choices[0].message?.content?.trim() || '';

        if (!content) {
            debug('Generated response was empty.');
        }

        return content;
    } catch (error: any) {
        debug('Error generating chat response: ' + error.message);
        throw error;
    }
}
