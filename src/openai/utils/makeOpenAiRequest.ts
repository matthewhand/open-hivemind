import OpenAI from 'openai';
import logger from '../../logging/logger';

/**
 * Sends a request to the OpenAI API and returns the response.
 * @param openaiClient - The initialized OpenAI client instance.
 * @param requestBody - The request body containing the parameters for the API call.
 * @returns The response object from the OpenAI API.
 */
export async function makeOpenAiRequest(
    openaiClient: OpenAI,
    requestBody: Record<string, any>
): Promise<any> {
    try {
        logger.debug('[makeOpenAiRequest] Sending request to OpenAI API.');
        const response = await openaiClient.chat.completions.create(requestBody);
        logger.debug('[makeOpenAiRequest] Received response from OpenAI API.');
        return response;
    } catch (error) {
        logger.error('[makeOpenAiRequest] Error during OpenAI API request: ' + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}
