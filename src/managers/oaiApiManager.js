const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    async sendRequest(requestBody) {
        try {
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

    buildRequestBody(historyMessages, userMessage) {
        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        } : null;

        let messages = systemMessage ? [systemMessage] : [];
        for (let msg of historyMessages) {
            messages.push({ role: msg.role, content: msg.content });
        }
        messages.push({ role: 'user', content: userMessage });

        return {
            model: constants.LLM_MODEL,
            messages: messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
