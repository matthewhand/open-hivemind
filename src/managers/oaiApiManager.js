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

            // Construct the full payload, including dynamically sourced LM parameters
            const fullPayload = {
                ...requestBody,
                temperature: constants.LLM_TEMPERATURE,
                max_tokens: constants.LLM_MAX_TOKENS,
                top_p: constants.LLM_TOP_P,
                frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
                presence_penalty: constants.LLM_PRESENCE_PENALTY,
            };

            logger.debug(`Sending request to ${constants.LLM_ENDPOINT_URL} with payload: ${JSON.stringify(fullPayload, null, 2)} and headers: ${JSON.stringify(headers, null, 2)}`);
            const response = await axios.post(constants.LLM_ENDPOINT_URL, fullPayload, { headers });

            // Log the response data for debugging
            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                logger.error(`API responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                // The request was made but no response was received
                logger.error(`No response received: ${error.request}`);
            } else {
                // Something happened in setting up the request that triggered an Error
                logger.error(`Error setting up request: ${error.message}`);
            }
            throw error;
        }
        
    },
    buildRequestBody(historyMessages, userMessage, model = constants.LLM_MODEL) {
        const botUserId = configurationManager.getConfig('BOT_USER_ID');
    
        const systemPrompt = { role: 'system', content: constants.LLM_SYSTEM_PROMPT };
        const formattedMessages = historyMessages.map(msg => ({
            role: msg.userId === botUserId ? 'assistant' : 'user',
            content: msg.content
        }));
    
        formattedMessages.push({ role: 'user', content: userMessage });
    
        let requestBody = {
            model,
            prompt: [systemPrompt, ...formattedMessages], // Adjusted to use 'prompt' instead of 'messages'
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    
        logger.debug(`Built OAI Request Body: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
    
}    
module.exports = oaiApiManager;
