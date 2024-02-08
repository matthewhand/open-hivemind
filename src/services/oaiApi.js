const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');

const oaiApi = {
    async sendRequest(requestBody) {
        try {
            // Validate request body before sending the request
            if (!requestBody || !requestBody.messages || !requestBody.model) {
                throw new Error('Invalid request body for OAI API request.');
            }

            // Log the request body for debugging
            logger.debug(`OAI API Request: ${JSON.stringify(requestBody, null, 2)}`);

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` })
                }
            });

            // Log the response data for debugging
            logger.debug(`OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, error);
            throw error;
        }
    },

    buildRequestBody(historyMessages, userMessage, botUserId, model = 'gpt-3.5-turbo') {
        if (model === '') {
            model = 'gpt-3.5-turbo'; // Ensure there's a default model
        }

        if (!historyMessages || !Array.isArray(historyMessages)) {
            throw new Error('Invalid history messages provided for building request body.');
        }

        let chatHistory = '';
        historyMessages.slice().reverse().forEach(msg => {
            // Format includes user ID and message content
            const formattedMessage = `<@${msg.userId}>: ${msg.content}\n`;
            // Check if adding this message exceeds the MAX_CONTENT_LENGTH
            if ((chatHistory.length + formattedMessage.length + userMessage.length + 1) <= constants.MAX_CONTENT_LENGTH) {
                chatHistory += formattedMessage;
            }
        });

        // Append the current user's message directly to chat history
        chatHistory += `<@${botUserId}>: ${userMessage}`;

        // Prompt the machine
        chatHistory += `<YOU>: `;

        let requestBody = {
            model: model,
            messages: [
                // System prompt to provide context or instructions for the AI
                { role: 'system', content: constants.SYSTEM_PROMPT },
                // The entire chat history, including the current message, as a single 'user' message
                { role: 'user', content: chatHistory }
            ]
        };

        logger.debug(`OAI Request Body Built: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
};

module.exports = oaiApi;
