const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        // Additional initialization if needed can be placed here
    }

    async sendRequest(requestBody) {
        try {
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
        const systemMessage = constants.LLM_SYSTEM_PROMPT ? [{
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        }] : [];

        const transformedMessages = historyMessages.map(msg => ({
            role: msg.authorId === constants.CLIENT_ID ? 'assistant' : 'user',
            content: msg.content
        }));

        const messages = [...systemMessage, ...transformedMessages];

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
        return true; // Indicates that message history is necessary for constructing the request
    }
}

module.exports = OpenAiManager;
