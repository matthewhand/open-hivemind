const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    async sendRequest(requestBody) {
        logger.debug("Sending OAI API Request with requestBody: ", JSON.stringify(requestBody, null, 2));

        try {
            if (!requestBody || typeof requestBody !== 'object' || !Array.isArray(requestBody.messages)) {
                throw new Error('Invalid request body for OAI API request.');
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });
            logger.debug("Received OAI API Response: ", JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            logger.error("Error in OAI API request: ", error.message);
            throw error;
        }
    }

    buildRequestBody(history = [], userMessage) {
        logger.debug("Building request body with history and userMessage: ", history, userMessage);

        const systemMessage = constants.LLM_SYSTEM_PROMPT ? [{
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        }] : [];

        const messages = systemMessage.concat(history.filter(msg => msg.content).map(msg => ({
            role: msg.role,
            content: msg.content
        })));

        if (userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }

        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        logger.debug("Constructed requestBody: ", requestBody);
        return requestBody;
    }

    requiresHistory() {
        return true; // Indicating this manager requires chat history
    }
}

module.exports = OpenAiManager;
