const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        // Removed botId from constructor, as we'll use constants.CLIENT_ID directly
    }

    async sendRequest(requestBody) {
        const botId = constants.CLIENT_ID; // Directly using constants.CLIENT_ID
        try {
            logger.debug(`Sending OAI API Request with bot ID ${botId}: ${JSON.stringify(requestBody, null, 2)}`);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });
            logger.info(`OAI API Response received successfully.`);
            return response.data;
        } catch (error) {
            const errMsg = `Error in OAI API request with bot ID ${botId}: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }

    buildRequestBody(historyMessages) {

        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        } : null;

        let messages = systemMessage ? [systemMessage] : [];
        messages = messages.concat(historyMessages.map(msg => ({
            role: msg.authorId === constants.CLIENT_ID ? 'assistant' : 'user', // Using constants.CLIENT_ID directly
            content: msg.content
        })));

        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        logger.debug(`Request body built successfully for OpenAI API: ${JSON.stringify(requestBody)}`);
        return requestBody;
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
