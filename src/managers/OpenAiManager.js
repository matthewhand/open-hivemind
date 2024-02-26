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
        let messages = [];

        // Include system message if it exists
        if (systemMessageContent) {
            messages.push({
                role: 'system',
                content: systemMessageContent
            });
        }

        // Ensure historyMessages alternates starting with 'user', even after system message
        let lastRole = 'system'; // Start with 'system' to ensure the first message is from 'user'
        historyMessages.forEach((message, index) => {
            const role = message.isFromBot() ? 'assistant' : 'user';
            if (role !== lastRole || lastRole === 'system') { // Allow first user message after system
                messages.push({
                    role: role,
                    content: message.getText() // Ensure this method gets the text content of the message
                });
                lastRole = role;
            } else {
                // Insert an empty message of the opposite role to maintain alternation
                const emptyRole = lastRole === 'user' ? 'assistant' : 'user';
                messages.push({ role: emptyRole, content: '' });
                messages.push({
                    role: role,
                    content: message.getText()
                });
                lastRole = role;
            }
        });

        // Ensure conversation ends with a 'user' message
        if (lastRole !== 'user') {
            messages.push({ role: 'user', content: '' });
        }

        return {
            model: constants.LLM_MODEL,
            messages,
            // Uncomment and adjust parameters as necessary
        };
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
