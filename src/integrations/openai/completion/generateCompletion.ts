import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';
import axios from 'axios';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();

/**
 * Generates a completion using the OpenAI API.
 *
 * This function sends a prompt to the OpenAI API and returns the generated completion.
 *
 * @param {string} prompt - The prompt to send to the OpenAI API.
 * @returns {Promise<string>} - The generated completion from the API.
 */
export async function generateCompletion(prompt: string): Promise<string> {
    const openaiConfig = configManager.getConfig('openaiConfig') as unknown as { OPENAI_API_KEY: string; OPENAI_MODEL: string; OPENAI_MAX_TOKENS: number; };

    if (!openaiConfig || !openaiConfig.OPENAI_API_KEY) {
        throw new Error('OpenAI configuration is missing or incomplete.');
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: openaiConfig.OPENAI_MODEL || 'gpt-4o-mini',
            prompt,
            max_tokens: openaiConfig.OPENAI_MAX_TOKENS || 100,
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${openaiConfig.OPENAI_API_KEY}`,
            },
        });

        debug('Generated completion:', response.data.choices[0].text.trim());
        return response.data.choices[0].text.trim();
    } catch (error: any) {
        debug('Error generating completion:', error);
        throw new Error(`Failed to generate completion: ${error.message}`);
    }
}
