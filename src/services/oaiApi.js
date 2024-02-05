const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');

const oaiApi = {
    async sendRequest(requestBody) {
        try {
            // Additional validation to ensure requestBody is not empty
            if (!requestBody || !requestBody.messages || !requestBody.model) {
                throw new Error('Invalid request body for OAI API request.');
            }

            logger.debug(`OAI API Request: ${JSON.stringify(requestBody, null, 2)}`);

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` })
                }
            });

            logger.debug(`OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, error);
            throw error;
        }
    },

    buildRequestBody(historyMessages, userMessage, botUserId, model = 'gpt-3.5-turbo') {
        if (!historyMessages || !Array.isArray(historyMessages)) {
            throw new Error('Invalid history messages provided for building request body.');
        }
    
        let requestBody = {
            model: model,
            messages: [{ role: 'system', content: constants.SYSTEM_PROMPT }]
        };
    
        let currentSize = JSON.stringify(requestBody).length;
        historyMessages.slice().reverse().forEach(msg => {
            const formattedMessage = `<@${msg.userId}>: ${msg.content}`;
            const messageObj = { role: 'user', content: formattedMessage };
            currentSize += JSON.stringify(messageObj).length;
    
            if (currentSize <= constants.MAX_CONTENT_LENGTH) {
                requestBody.messages.push(messageObj);
            }
        });
    
        // Append the user's message and a placeholder for the bot's response
        requestBody.messages.push({ role: 'user', content: userMessage });
        requestBody.messages.push({ role: 'assistant', content: `<@${botUserId}>: ` });
    
        logger.debug(`OAI Request Body Built: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
};

module.exports = oaiApi;
