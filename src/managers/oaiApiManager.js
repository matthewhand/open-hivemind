const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    async sendRequest(requestBody) {
        try {
            if (!requestBody || !requestBody.messages) {
                throw new Error('Invalid request body for OAI API request.');
            }

            logger.debug(`Sending OAI API Request: ${JSON.stringify(requestBody, null, 2)}`);
            // Prepare the headers with the authorization token
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };

            // Perform the POST request to the specified endpoint URL
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });

            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, { error });
            throw error;
        }
    }

    buildRequestBody(history = [], userMessage) {
        // Prepare a system prompt, if defined
        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        } : null;

        // Map history messages and append the user's current message
        const messages = [
            ...(systemMessage ? [systemMessage] : []),
            ...history.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage }
        ];

        return {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    }

    requiresHistory() {
        return true; // Assuming this manager requires chat history
    }
}

module.exports = OpenAiManager;
