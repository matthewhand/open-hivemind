import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI } from 'openai';

const configManager = ConfigurationManager.getInstance();
const openaiConfig = configManager.getConfig('openai');

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

        // Handle the response correctly, ensuring the 'data' property is accessible
        // @ts-expect-error: Suppressing deep instantiation issue for now
        if (!response?.data) {
            throw new Error('Response data is missing or undefined.');
        }
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to send completion request: ${error.message}`);
    }
}
