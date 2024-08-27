import Debug from 'debug';
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import { sendRequest } from '@src/llm/openai/operations/sendRequest';
import LLMResponse from '@src/llm/LLMResponse';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:generateResponse');

/**
 * Generates a response using the OpenAI service.
 *
 * This function sends a transcript as a prompt to the OpenAiService and returns the generated response.
 *
 * Key Features:
 * - Uses the sendRequest function from the OpenAiService module.
 * - Handles and logs errors if the API request fails.
 * - Returns the generated response content or undefined if there was an error.
 *
 * @param {OpenAiService} aiService - The OpenAI service instance.
 * @param {string} transcript - The transcript text to generate a response from.
 * @returns {Promise<string | undefined>} The generated response text.
 */
export async function generateResponse(aiService: OpenAiService, transcript: string): Promise<string | undefined> {
    try {
        const response: LLMResponse = await sendRequest(aiService, {
            model: aiService.getModel(),
            messages: [{ role: 'user', content: transcript }],
            max_tokens: ConfigurationManager.LLM_MAX_TOKENS,
            temperature: ConfigurationManager.LLM_TEMPERATURE,
            top_p: ConfigurationManager.LLM_TOP_P,
            frequency_penalty: ConfigurationManager.LLM_FREQUENCY_PENALTY,
            presence_penalty: ConfigurationManager.LLM_PRESENCE_PENALTY,
        });
        return response.getContent();
    } catch (error: any) {
        debug('Error generating response: ' + (error instanceof Error ? error.message : String(error)));
        return undefined;
    }
}
