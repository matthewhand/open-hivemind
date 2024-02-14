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

            const headers = {
                'Content-Type': 'application/json',
                ...(constants.LLM_API_KEY && { 'Authorization': `Bearer ${constants.LLM_API_KEY}` }),
            };

            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });

            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, { error });
            throw error;
        }
    }

    buildRequestBody(historyMessages, userMessage, model = constants.LLM_MODEL) {
        const messages = historyMessages.map(msg => ({
            role: msg.authorId === 'ASSISTANT_AUTHOR_ID' ? 'assistant' : 'user', // Determine role based on authorId or another property
            content: msg.content
        }));
    
        // Optionally, add a system message
        messages.unshift({
            role: 'system',
            content: constants.SYSTEM_PROMPT
        });
    
        // Add the user's current message
        messages.push({ role: 'user', content: userMessage });
    
        return {
            model,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    }
    
    requiresHistory() {
        // Override to specify that this manager requires chat history
        return true;
    }
};

module.exports = OpenAiManager;
