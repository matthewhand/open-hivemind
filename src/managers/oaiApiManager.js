const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    async sendRequest(requestBody) {
        logger.debug("OpenAiManager.sendRequest called with requestBody:", requestBody);

        try {
            if (!requestBody || !Array.isArray(requestBody.messages)) {
                throw new Error('Invalid request body for OAI API request.');
            }

            logger.debug(`Sending OAI API Request: ${JSON.stringify(requestBody, null, 2)}`);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });
            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, { error });
            throw error;
        }
    }

    buildRequestBody(history = [], userMessage) {
        logger.debug("OpenAiManager.buildRequestBody called with history and userMessage:", history, userMessage);

        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        } : null;

        let messages = systemMessage ? [systemMessage] : [];

        if (Array.isArray(history) && history.length > 0) {
            history.forEach(msg => {
                if (msg && msg.role && msg.content) {
                    messages.push({ role: msg.role, content: msg.content });
                }
            });
        }

        messages.push({ role: 'user', content: userMessage });

        logger.debug("Constructed messages array for requestBody:", messages);

        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        logger.debug("Final requestBody for OAI API Request:", requestBody);
        return requestBody;
    }

    requiresHistory() {
        logger.debug("OpenAiManager.requiresHistory called.");
        return true; // Indicating that this manager requires chat history
    }
}

module.exports = OpenAiManager;
