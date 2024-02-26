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

        // Directly map historyMessages to the expected format, assuming they are already alternating
        let userAndAssistantMessages = historyMessages.map(message => ({
            role: message.isFromBot() ? 'assistant' : 'user', // Adjust based on your method to check message origin
            content: message.getText() // Adjust based on your method to get message text
        }));

        // Ensure the sequence starts with a 'user' role if not preceded by a system message
        if (messages.length === 0 || messages[0].role === 'system') {
            if (userAndAssistantMessages.length === 0 || userAndAssistantMessages[0].role !== 'user') {
                userAndAssistantMessages.unshift({ role: 'user', content: '' }); // Prepend an empty user message if needed
            }
        }

        // Ensure the last message is from a user
        if (userAndAssistantMessages.length > 0 && userAndAssistantMessages[userAndAssistantMessages.length - 1].role !== 'user') {
            userAndAssistantMessages.push({ role: 'user', content: '' }); // Append an empty user message if needed
        }

        // Combine system messages with user and assistant messages
        messages = [...messages, ...userAndAssistantMessages];

        return {
            model: constants.LLM_MODEL,
            messages,
            // Uncomment and adjust the following parameters as necessary
            // temperature: constants.LLM_TEMPERATURE,
            // max_tokens: constants.LLM_MAX_TOKENS,
            // top_p: constants.LLM_TOP_P,
            // frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            // presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
