import { OpenAI } from 'openai';
import Debug from 'debug';

const debug = Debug('app:OpenAiService');

/**
 * Lists all available models from OpenAI.
 *
 * @param openai - The OpenAI API client instance.
 * @returns {Promise<any>} - The list of available models.
 */
export async function listModels(openai: OpenAI): Promise<any> {
    try {
        const response = await openai.models.list();
        debug('Available models:', response.data);
        return response.data;
    } catch (error: any) {
        debug('Error listing models:', error);
        throw new Error(`Failed to list models: ${error.message}`);
    }
}
