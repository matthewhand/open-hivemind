import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { OpenAI } from 'openai';
import Debug from 'debug';

const debug = Debug('app:sendCompletions');

if (!openaiConfig) {
    throw new Error('OpenAI configuration not found. Please ensure the OpenAI config is loaded.');
}

const openai = new OpenAI({
    apiKey: openaiConfig.get('OPENAI_API_KEY'),
    baseURL: openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com',
    organization: openaiConfig.get('OPENAI_ORGANIZATION'),
    timeout: openaiConfig.get('OPENAI_TIMEOUT') || 30000,
});

/**
 * Sends a completion request to the OpenAI API.
 *
 * @param {string} prompt - The prompt to be completed by the OpenAI model.
 * @returns {Promise<any>} - The response from the OpenAI API.
 */
export async function sendCompletions(prompt: string): Promise<any> {
    if (!openaiConfig) {
        throw new Error('OpenAI configuration is not loaded.');
    }

    try {
        const response = await openai.completions.create({
            model: openaiConfig.get('OPENAI_MODEL') || 'gpt-4o-mini',
            prompt,
            max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 100,
            temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
            frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY'),
            presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY'),
            stop: openaiConfig.get('OPENAI_STOP'),
            top_p: openaiConfig.get('OPENAI_TOP_P'),
        });

        if (!response?.choices) {
            throw new Error('Response choices are missing or undefined.');
        }
        return response.choices;
    } catch (error: any) {
        if (error.response?.status === 429) {
            debug('Rate-limited by OpenAI API. Retrying after a delay...');
            await new Promise(res => setTimeout(res, 5000)); // Improvement: rate-limiting retry
            return sendCompletions(prompt);
        }
        if (error.response?.status === 408) {
            debug('Request timed out. Retrying...'); // Improvement: handle timeouts
            return sendCompletions(prompt);
        }
        throw new Error(`Failed to send completion request: ${error.message}`);
    }
}
