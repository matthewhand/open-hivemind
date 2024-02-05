const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');

const oaiApi = {
    async sendRequest(requestBody) {
        try {
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` })
                }
            });

            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`);
            throw error;
        }
    },

    buildRequestBody(historyMessages, userMessage, model = 'gpt-3.5-turbo') {
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

        requestBody.messages.push({ role: 'user', content: userMessage });
        return requestBody;
    }
};

module.exports = oaiApi;
