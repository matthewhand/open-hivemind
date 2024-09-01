import { OpenAI } from 'openai';
import ConfigurationManager from '@config/ConfigurationManager';
import Debug from 'debug';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();

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

export async function generateCompletion(prompt: string): Promise<string> {
    try {
        const response = await openai.completions.create({
            model: openaiConfig.OPENAI_MODEL || 'gpt-4o-mini',
            prompt,
            max_tokens: openaiConfig.OPENAI_MAX_TOKENS || 150,
            temperature: openaiConfig.OPENAI_TEMPERATURE || 0.7,
            frequency_penalty: openaiConfig.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: openaiConfig.OPENAI_PRESENCE_PENALTY,
            stop: openaiConfig.OPENAI_STOP,
            top_p: openaiConfig.OPENAI_TOP_P,
        });

        debug('Generated completion:', response.data.choices[0].text.trim());
        return response.data.choices[0].text.trim();
    } catch (error: any) {
        debug('Error generating completion:', error);
        throw new Error(`Failed to generate completion: ${error.message}`);
    }
}

export async function listModels(): Promise<any> {
    try {
        const response = await openai.models.list();
        debug('Available models:', response.data);
        return response.data;
    } catch (error: any) {
        debug('Error listing models:', error);
        throw new Error(`Failed to list models: ${error.message}`);
    }
}
