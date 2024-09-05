import Debug from 'debug';
import axios from 'axios';
import openaiConfig from '@integrations/openai/config/openaiConfig';

const debug = Debug('app:OpenAiService');

/**
 * Generates a completion using the OpenAI API.
 *
 * This function sends a prompt to the OpenAI API and returns the generated completion.
 *
 * @param {string} prompt - The prompt to send to the OpenAI API.
 * @returns {Promise<string>} - The generated completion from the API.
 */
export async function generateCompletion(prompt: string): Promise<string> {
    if (!openaiConfig || !openaiConfig.get('OPENAI_API_KEY')) {
        throw new Error('OpenAI configuration is missing or incomplete.');
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: openaiConfig.get('OPENAI_MODEL') || 'gpt-4o-mini',
            prompt,
            max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 100,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${openaiConfig.get('OPENAI_API_KEY')}`,
            },
        });

        debug('Generated completion:', response.data.choices[0].text.trim());
        return response.data.choices[0].text.trim();
    } catch (error: any) {
        debug('Error generating completion:', error);
        throw new Error(`Failed to generate completion: ${error.message}`);
    }
}
