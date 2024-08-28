import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import { sendRequest } from '@src/integrations/openai/operations/sendRequest';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:createAiResponse');
const configManager = new ConfigurationManager();

/**
 * Creates a response using the OpenAiService.
 * Submits a transcript as input to the OpenAiService and retrieves a generated response.
 * 
 * @param {OpenAiService} aiService - The OpenAiService instance.
 * @param {string} transcript - The input text to be processed.
 * @returns {Promise<string | undefined>} The generated response or undefined on error.
 */
export async function createAiResponse(aiService: OpenAiService, transcript: string): Promise<string | undefined> {
    try {
        const response: LLMResponse = await sendRequest(aiService, {
            model: configManager.OPENAI_MODEL,  // Updated to use configManager
            messages: [{ role: 'user', content: transcript }],
            max_tokens: configManager.OPENAI_MAX_TOKENS,
            temperature: configManager.OPENAI_TEMPERATURE,
            top_p: configManager.LLM_TOP_P,
            frequency_penalty: configManager.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: configManager.OPENAI_PRESENCE_PENALTY,
        });
        return response.getContent();
    } catch (error) {
        debug('Error generating response: ' + (error instanceof Error ? error.message : String(error)));
        return undefined;
    }
}
