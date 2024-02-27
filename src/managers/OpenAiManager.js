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

    buildRequestBody(historyMessages, systemMessageContent = 'You are a helpful assistant') {
        let messages = systemMessageContent ? [{
            role: 'system',
            content: systemMessageContent
        }] : [];

        historyMessages = historyMessages.reverse();

        let needsCorrection = false;
        let lastRole = 'system';

        historyMessages.forEach(message => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';

            if (lastRole === 'user' && currentRole === 'assistant' || lastRole === 'assistant' && currentRole === 'user' || lastRole === 'system') {
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            } else {
                needsCorrection = true;
            }
            lastRole = currentRole;
        });

        if (needsCorrection) {
            let correctedMessages = [];
            lastRole = 'system';
            messages.forEach(message => {
                if (message.role !== lastRole || lastRole === 'system') {
                    correctedMessages.push(message);
                } else {
                    const correctionRole = lastRole === 'user' ? 'assistant' : 'user';
                    correctedMessages.push({ role: correctionRole, content: '...' });
                    correctedMessages.push(message);
                }
                lastRole = message.role;
            });

            if (lastRole === 'assistant') {
                correctedMessages.push({ role: 'user', content: '...' });
            }

            messages = correctedMessages;
        }

        if (messages.length > 1 && messages[1].role === 'assistant') {
            messages.splice(1, 0, { role: 'user', content: '...' });
        }

        return {
            model: constants.LLM_MODEL,
            messages,
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
