import Debug from 'debug';
import axios from 'axios';
import constants from '@config/ConfigurationManager';

const debug = Debug('app:generateResponse');

/**
 * Generates a response using the LLM API.
 *
 * This function sends a prompt to the LLM API to generate a response.
 * It handles the API request, manages errors, and returns the response text.
 *
 * Key Features:
 * - Sends a prompt to the LLM API.
 * - Handles and logs errors if the API request fails.
 * - Returns the generated response text or undefined if there was an error.
 *
 * @param {string} transcript - The transcript text to generate a response from.
 * @returns {Promise<string | undefined>} The generated response text.
 */
export async function generateResponse(transcript: string): Promise<string | undefined> {
    const llmEndpointUrl = constants.LLM_ENDPOINT_URL;
    if (!llmEndpointUrl) {
        debug('LLM_ENDPOINT_URL is not set in the environment variables.');
        return undefined;
    }
    debug('LLM_ENDPOINT_URL: ' + llmEndpointUrl);
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
        debug('Error generating response: ' + (error instanceof Error ? error.message : String(error)));
        return undefined;
    }
}
