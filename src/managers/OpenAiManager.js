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
    
        let userAndAssistantMessages = historyMessages.filter(message => message.role !== 'system');

        // Ensure the sequence properly alternates, starting with 'user'
        let alternatingMessages = [];
        let lastRole = 'assistant'; // Start opposite to ensure first message is 'user'
        userAndAssistantMessages.forEach(message => {
            if (message.role !== lastRole) {
                // If alternating, add the message and update lastRole
                alternatingMessages.push(message);
                lastRole = message.role;
            } else {
                // If not alternating, insert an empty message of the opposite role to maintain alternation
                let emptyRole = lastRole === 'user' ? 'assistant' : 'user';
                alternatingMessages.push({ role: emptyRole, content: '' });
                alternatingMessages.push(message);
                lastRole = message.role; // Update lastRole as the message role
            }
        });

        // Ensure it ends with a 'user' message
        if (lastRole !== 'user') {
            alternatingMessages.push({ role: 'user', content: '' }); // Add an empty 'user' message if needed
        }

        // Append the alternating messages to the system message if it exists
        messages = [...messages, ...alternatingMessages];
    
        return {
            model: constants.LLM_MODEL,
            messages,
            // temperature, max_tokens, top_p, frequency_penalty, presence_penalty as needed
        };
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
