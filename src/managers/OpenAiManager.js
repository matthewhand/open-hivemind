const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        // Initialized OpenAiManager, ready to handle requests
        logger.debug('OpenAiManager initialized');
    }

    /**
     * Sends a request to the OpenAI API and returns the response.
     * @param {Object} requestBody - The body of the request to send to the API.
     * @returns {Promise<Object>} - The response from the OpenAI API.
     */
    async sendRequest(requestBody) {
        const url = constants.LLM_ENDPOINT_URL;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${constants.LLM_API_KEY}`,
        };

        logger.debug(`Sending request to OpenAI API: ${url} with body: ${JSON.stringify(requestBody, null, 2)}`);

        try {
            const response = await axios.post(url, requestBody, { headers });
            logger.info('Response received from OpenAI API.');
            return response.data;
        } catch (error) {
            const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }

    /**
     * Builds the request body for the OpenAI API based on the provided history messages.
     * @param {Array<Object>} historyMessages - The history of messages to include in the request.
     * @returns {Object} - The constructed request body.
     */
    buildRequestBody(historyMessages) {
        // Print pre-transformation payload
        logger.debug(`Pre-transformation historyMessages: ${JSON.stringify(historyMessages, null, 2)}`);
    
        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT,
        } : null;
    
        const messages = systemMessage ? [systemMessage] : [];
        messages.push(...historyMessages.map(msg => {
            // Determine the role based on authorId
            const role = msg.authorId === constants.CLIENT_ID ? 'assistant' : 'user';
            return {
                role: role,
                content: msg.content || '', // Ensure content is always a string
            };
        }));
    
        // Print out the mapping from pre-transformation to post-transformation
        logger.debug(`Mapping and transformed messages: ${JSON.stringify(messages, null, 2)}`);
    
        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    
        // Print out the constructed request body for OpenAI API
        logger.debug(`Request body for OpenAI API constructed: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
        
    /**
     * Indicates whether the manager requires message history for constructing the request.
     * @returns {boolean} - True if message history is required, false otherwise.
     */
    requiresHistory() {
        // This implementation always requires message history.
        return true;
    }
}

module.exports = OpenAiManager;
