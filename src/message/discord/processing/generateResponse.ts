import Debug from 'debug';
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import { sendRequest } from '@src/llm/openai/operations/sendRequest';
import LLMResponse from '@src/llm/LLMResponse';

const debug = Debug('app:generateResponse');

/**
 * Generates a response using the OpenAI service.
 *
 * This function sends a transcript as a prompt to the OpenAiService and returns the generated response.
 *
 * Key Features:
 * - Uses the sendRequest function from the OpenAiService module.
 * - Handles and logs errors if the API request fails.
 * - Returns the generated response text or undefined if there was an error.
 *
 * @param {OpenAiService} aiService - The OpenAI service instance.
 * @param {string} transcript - The transcript text to generate a response from.
 * @returns {Promise<string | undefined>} The generated response text.
 */
export async function generateResponse(aiService: OpenAiService, transcript: string): Promise<string | undefined> {
    try {
        const response: LLMResponse = await sendRequest(aiService, {
            model: aiService.model,
            messages: [{ role: 'user', content: transcript }],
            max_tokens: 20,
        });
        return response.text;
    } catch (error: any) {
        debug('Error generating response: ' + (error instanceof Error ? error.message : String(error)));
        return undefined;
    }
}
