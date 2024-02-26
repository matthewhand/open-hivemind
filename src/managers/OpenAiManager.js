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

        // Enforce starting with 'user' after 'system' by adding an initial 'user' message if necessary
        if (messages.length > 0) { // If there's a system message
            messages.push({
                role: 'user',
                content: '' // Start with an empty 'user' message to ensure correct alternation
            });
        }

        let lastRole = messages.length > 0 ? messages[messages.length - 1].role : '';

        historyMessages.forEach(message => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            if (currentRole === lastRole) {
                // If same as last role, correct by inserting an empty message of the opposite role
                const correctionRole = currentRole === 'user' ? 'assistant' : 'user';
                messages.push({
                    role: correctionRole,
                    content: ''
                });
            }
            messages.push({
                role: currentRole,
                content: message.getText()
            });
            lastRole = currentRole;
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
