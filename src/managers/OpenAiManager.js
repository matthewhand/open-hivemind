const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        this.isResponding = false; // Tracks if the bot is currently set to respond
        logger.debug('OpenAiManager initialized');
    }

    setIsResponding(state) {
        this.isResponding = state;
    }

    getIsResponding() {
        return this.isResponding;
    }

    buildRequestBody(historyMessages, systemMessageContent = null) {
        if (!this.getIsResponding()) {
            throw new Error('Bot is set to not respond.');
        }

        if (systemMessageContent === null) {
            systemMessageContent = constants.LLM_SYSTEM_PROMPT;
        }

        let messages = systemMessageContent ? [{
            role: 'system',
            content: systemMessageContent
        }] : [];

        // Reverse the historyMessages to ensure they are in the correct order (oldest to newest)
        historyMessages = historyMessages.reverse();

        let lastRole = 'system';

        historyMessages.forEach(message => {
            const currentRole = message.isFromBot ? 'assistant' : 'user';

            // Ensure there is a switch between user and assistant messages
            if (lastRole === 'user' && currentRole === 'assistant' || lastRole === 'assistant' && currentRole === 'user' || lastRole === 'system') {
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            } else {
                // This handles cases where two messages from the same 'role' are consecutive,
                // which should not happen in a normal conversation flow.
                // You might need to adjust this logic based on your specific requirements.
                messages.push({
                    role: currentRole === 'user' ? 'assistant' : 'user', // Switch roles to simulate a 'correction'
                    content: '...' // Placeholder text to simulate a message from the opposite role
                });
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            }
            lastRole = currentRole;
        });

        // Ensure the conversation starts with a user message if it starts with an assistant message
        if (messages.length > 1 && messages[1].role === 'assistant') {
            messages.splice(1, 0, { role: 'user', content: '...' });
        }

        return {
            model: constants.LLM_MODEL,
            messages,
            // Include other necessary fields for your request body here
        };
    }

    async sendRequest(requestBody) {
        const url = constants.LLM_ENDPOINT_URL;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${constants.LLM_API_KEY}`,
        };

        logger.debug(`Sending request to OpenAI API: ${url} with body:`, requestBody);

        try {
            const response = await axios.post(url, requestBody, { headers });
            logger.info('Response received from OpenAI API.');
            logger.debug('OpenAI API response:', response.data);
            return response.data;
        } catch (error) {
            const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }

    async summarizeTextAsBulletPoints(text) {
        const systemMessageContent = 'Please summarize the following text as a list of bullet points:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);

        // Send the request to the OpenAI API
        const summaryResponse = await this.sendRequest(requestBody);
        return this.processSummaryResponse(summaryResponse.choices[0].text);
    }

    processSummaryResponse(summaryText) {
        // Split the summary into bullet points based on the bullet symbol used (e.g., "-", "*")
        const bulletPoints = summaryText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));

        // Further processing to clean up each bullet point, if necessary, can be done here
        return bulletPoints.map(point => point.trim());
    }

    buildRequestBodyForSummarization(text, systemMessageContent) {
        return {
            model: constants.LLM_MODEL,
            prompt: `${systemMessageContent}\n\n${text}`,
            temperature: 0.5,
            max_tokens: 1024,
            stop: ["\n\n"]
        };
    }


    async summarizeText(text) {
        const systemMessageContent = 'Summarize the following text:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);

        return await this.sendRequest(requestBody);
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
