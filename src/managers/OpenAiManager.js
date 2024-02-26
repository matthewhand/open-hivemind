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

    buildRequestBody(historyMessages, channelTopic = '') {
        const systemMessageContent = constants.LLM_SYSTEM_PROMPT + (channelTopic ? ` Channel Topic: ${channelTopic}` : '');
        let messages = systemMessageContent ? [{
            role: 'system',
            content: systemMessageContent
        }] : [];

        // Reverse historyMessages to ensure the most recent is processed last
        historyMessages = historyMessages.reverse();

        let needsCorrection = false;
        let lastRole = 'system'; // Assume starting after system message

        historyMessages.forEach(message => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';

            // Check if the current message continues the alternation pattern
            if (lastRole === 'user' && currentRole === 'assistant' || lastRole === 'assistant' && currentRole === 'user' || lastRole === 'system') {
                // No correction needed; add the message directly
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            } else {
                // Alternation needs correction
                needsCorrection = true;
            }
            lastRole = currentRole; // Update for next iteration
        });

        // Apply corrections if needed
        if (needsCorrection) {
            // Rebuild messages considering corrections for alternation
            let correctedMessages = [];
            lastRole = 'system'; // Reset for correction pass
            messages.forEach(message => {
                if (message.role !== lastRole || lastRole === 'system') {
                    correctedMessages.push(message);
                } else {
                    // Inject an empty message to maintain alternation
                    const correctionRole = lastRole === 'user' ? 'assistant' : 'user';
                    correctedMessages.push({ role: correctionRole, content: '' });
                    correctedMessages.push(message);
                }
                lastRole = message.role;
            });

            // Ensure ending with 'user' message
            if (lastRole === 'assistant') {
                correctedMessages.push({ role: 'user', content: '' });
            }

            messages = correctedMessages;
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
