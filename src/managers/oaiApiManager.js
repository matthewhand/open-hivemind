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

            // Prepare headers, conditionally include Authorization if LLM_API_KEY is set
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

    buildRequestBody(historyMessages, userMessage, botUserId, model = 'gpt-3.5-turbo') {
        if (!historyMessages || !Array.isArray(historyMessages)) {
            throw new Error('Invalid history messages provided for building request body.');
        }

        let chatHistory = historyMessages.slice().reverse().reduce((acc, msg) => {
            const formattedMessage = `<@${msg.userId}>: ${msg.content}\n`;
            if ((acc.length + formattedMessage.length + userMessage.length + 1) <= constants.MAX_CONTENT_LENGTH) {
                return acc + formattedMessage;
            }
            return acc;
        }, '');

        // Append the current user's message directly to chat history
        chatHistory += `\n<@${botUserId}>: ${userMessage}\n`;

        // Prompt the machine
        chatHistory += `<YOU>: `;

        let requestBody = {
            model,
            messages: [
                { role: 'system', content: constants.SYSTEM_PROMPT },
                { role: 'user', content: chatHistory }
            ]
        };

        logger.debug(`Built OAI Request Body: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
};

module.exports = oaiApiManager;
