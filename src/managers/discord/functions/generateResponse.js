const axios = require('axios');
const logger = require('../../../utils/logger');
const constants = require('../../../config/constants');

/**
 * Generates a response using the LLM API.
 * @param {string} transcript - The transcript text to generate a response from.
 * @returns {Promise<string>} The generated response text.
 */
async function generateResponse(transcript) {
    const llmEndpointUrl = constants.LLM_ENDPOINT_URL;
    if (!llmEndpointUrl) {
        logger.error('LLM_ENDPOINT_URL is not set in the environment variables.');
        return;
    }

    logger.debug('LLM_ENDPOINT_URL: ' + llmEndpointUrl);

    const response = await axios.post(llmEndpointUrl, {
        prompt: transcript,
        max_tokens: 20,
    }, {
        headers: {
            'Authorization': 'Bearer ' + constants.LLM_API_KEY
        }
    });

    return response.data.choices[0].text.trim();
}

module.exports = generateResponse;
