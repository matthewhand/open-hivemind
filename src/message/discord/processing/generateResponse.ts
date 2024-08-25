import axios from 'axios';
import logger from '@src/operations/logger';
import constants from '@config/ConfigurationManager';

/**
 * Generates a response using the LLM API.
 * @param {string} transcript - The transcript text to generate a response from.
 * @returns {Promise<string>} The generated response text.
 */
export async function generateResponse(transcript: string): Promise<string | undefined> {
    const llmEndpointUrl = constants.LLM_ENDPOINT_URL;
    if (!llmEndpointUrl) {
        logger.error('LLM_ENDPOINT_URL is not set in the environment variables.');
        return undefined;
    }

    logger.debug('LLM_ENDPOINT_URL: ' + llmEndpointUrl);

    try {
        const response = await axios.post(llmEndpointUrl, {
            prompt: transcript,
            max_tokens: 20,
        }, {
            headers: {
                'Authorization': 'Bearer ' + constants.LLM_API_KEY,
            },
        });

        return response.data.choices[0].text.trim();
    } catch (error: any) {
        logger.error('Error generating response: ' + (error instanceof Error ? error.message : String(error)));
        return undefined;
    }
}
