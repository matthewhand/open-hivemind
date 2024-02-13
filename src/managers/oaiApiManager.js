const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');

const oaiApiManager = {
    async sendRequest(requestBody) {
        try {
            // Validate request body before sending the request
            if (!requestBody || !requestBody.messages) {
                throw new Error('Invalid request body for OAI API request.');
            }

            // Log the request body for debugging
            logger.debug(`Sending OAI API Request: ${JSON.stringify(requestBody, null, 2)}`);

            // Prepare headers, including Authorization if LLM_API_KEY is set
            const headers = {
                'Content-Type': 'application/json',
                ...(constants.LLM_API_KEY && { 'Authorization': `Bearer ${constants.LLM_API_KEY}` }),
            };

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });

            // Log the response data for debugging
            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, { error });
            throw error;
        }
    },

    buildRequestBody(historyMessages, userMessage, model = constants.LLM_MODEL) {
        // Validate input parameters
        if (!historyMessages || !Array.isArray(historyMessages)) {
            throw new Error('Invalid history messages provided for building request body.');
        }
        if (!userMessage) {
            throw new Error('Invalid user message provided for building request body.');
        }

        const messages = historyMessages.map(msg => ({
            role: msg.userId === constants.BOT_USER_ID ? 'assistant' : 'user',
            content: msg.content
        }));

        // Add the user's current message
        messages.push({ role: 'user', content: userMessage });

        let requestBody = {
            model,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };

        logger.debug(`Built OAI Request Body: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
};

module.exports = oaiApiManager;
