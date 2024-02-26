const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        logger.debug('OpenAiManager initialized');
    }

    async sendRequest(requestBody) {
        const url = constants.LLM_ENDPOINT_URL;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${constants.LLM_API_KEY}`,
        };
        logger.debug(`Sending request to OpenAI API: ${url} with body: ${JSON.stringify(requestBody, null, 2)}`);

        try {
            const response = await axios.post(url, requestBody, { headers });
            logger.info('Response received from OpenAI API.');
            logger.debug(`OpenAI API response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }

    buildRequestBody(historyMessages) {
        const systemMessageContent = constants.LLM_SYSTEM_PROMPT;
        let messages = systemMessageContent ? [{
            role: 'system',
            content: systemMessageContent
        }] : [];

        // Track the last role to ensure alternation; start as 'user' to force the first non-system message to be 'assistant'
        let lastRole = 'user';

        historyMessages.forEach(message => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            // If the current message continues the alternation pattern, add it directly
            if (currentRole !== lastRole) {
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
                lastRole = currentRole;
            } else {
                // If the current message breaks the pattern, insert an empty message to correct the pattern
                messages.push({
                    role: currentRole === 'user' ? 'assistant' : 'user', // Switch role for the empty message
                    content: ''
                }, {
                    role: currentRole,
                    content: message.getText()
                });
            }
        });

        // Ensure the sequence ends with a 'user' message, adjusting if necessary
        if (lastRole !== 'user') {
            messages.push({ role: 'user', content: '' });
        }

        return {
            model: constants.LLM_MODEL,
            messages,
        };
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
