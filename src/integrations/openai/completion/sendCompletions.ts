import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI } from 'openai';

const configManager = ConfigurationManager.getInstance();

// Define explicit type for OpenAI Config
interface OpenAiConfig {
    OPENAI_API_KEY?: string;
    OPENAI_BASE_URL?: string;
    OPENAI_TIMEOUT?: number;
    OPENAI_ORGANIZATION?: string;
    OPENAI_MODEL?: string;
    OPENAI_MAX_TOKENS?: number;
    OPENAI_TEMPERATURE?: number;
    OPENAI_FREQUENCY_PENALTY?: number;
    OPENAI_PRESENCE_PENALTY?: number;
    OPENAI_STOP?: string[];
    OPENAI_TOP_P?: number;
}

const openaiConfig = configManager.getConfig('openaiConfig') as OpenAiConfig;

const openai = new OpenAI({
    apiKey: openaiConfig.OPENAI_API_KEY!,
    baseURL: openaiConfig.OPENAI_BASE_URL || 'https://api.openai.com',
    organization: openaiConfig.OPENAI_ORGANIZATION,
    timeout: openaiConfig.OPENAI_TIMEOUT || 30000,
});

/**
 * Sends a completion request to the OpenAI API.
 *
 * @param {string} prompt - The prompt to be completed by the OpenAI model.
 * @returns {Promise<any>} - The response from the OpenAI API.
 */
export async function sendCompletions(prompt: string): Promise<any> {
    try {
        const response = await openai.completions.create({
            model: openaiConfig.OPENAI_MODEL || 'gpt-4o-mini',
            prompt,
            max_tokens: openaiConfig.OPENAI_MAX_TOKENS || 100,
            temperature: openaiConfig.OPENAI_TEMPERATURE || 0.7,
            frequency_penalty: openaiConfig.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: openaiConfig.OPENAI_PRESENCE_PENALTY,
            stop: openaiConfig.OPENAI_STOP,
            top_p: openaiConfig.OPENAI_TOP_P,
        });

        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to send completion request: ${error.message}`);
    }
}
