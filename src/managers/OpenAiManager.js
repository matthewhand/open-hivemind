const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        // Initialization if needed
    }

    async sendRequest(requestBody) {
        try {
            // Enhanced logging for clarity
            logger.debug(`Sending request to OpenAI API with body: ${JSON.stringify(requestBody, null, 2)}`);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });
            logger.info('Response successfully received from OpenAI API.');
            return response.data;
        } catch (error) {
            const errMsg = `OpenAI API request error: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }

    buildRequestBody(historyMessages) {
        // System message inclusion based on the presence of LLM_SYSTEM_PROMPT
        const systemMessage = constants.LLM_SYSTEM_PROMPT ? [{
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        }] : [];

        // Transforming message history while directly using constants.CLIENT_ID for role assignment
        const transformedMessages = historyMessages.map(msg => ({
            role: msg.authorId === constants.CLIENT_ID ? 'assistant' : 'user',
            content: msg.content
        }));

        // Combining system message with transformed message history
        const messages = [...systemMessage, ...transformedMessages];

        // Assembling the request body
        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        logger.debug(`Constructed request body for OpenAI API: ${JSON.stringify(requestBody)}`);
        return requestBody;
    }

    requiresHistory() {
        // Returning true to indicate that message history is needed for request building
        return true;
    }
}

module.exports = OpenAiManager;
