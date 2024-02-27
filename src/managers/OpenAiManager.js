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
        logger.debug(`setIsResponding: State set to ${state}`);
    }

    getIsResponding() {
        logger.debug(`getIsResponding: Returning ${this.isResponding}`);
        return this.isResponding;
    }

    buildRequestBody(historyMessages, systemMessageContent = null) {
        logger.debug('Entering buildRequestBody');
        if (systemMessageContent === null) {
            systemMessageContent = constants.LLM_SYSTEM_PROMPT;
            logger.debug(`buildRequestBody: Using default system message content`);
        }

        let messages = systemMessageContent ? [{
            role: 'system',
            content: systemMessageContent
        }] : [];

        historyMessages = historyMessages.reverse(); // Reverse the historyMessages
        logger.debug(`buildRequestBody: Reversed historyMessages`);

        let lastRole = 'system';

        historyMessages.forEach((message, index) => {
            logger.debug(`buildRequestBody: Processing message ${index}`);
            const currentRole = message.isFromBot ? 'assistant' : 'user';

            if (lastRole === 'user' && currentRole === 'assistant' || lastRole === 'assistant' && currentRole === 'user' || lastRole === 'system') {
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            } else {
                logger.debug(`buildRequestBody: Adjusting for consecutive messages from the same role`);
                messages.push({
                    role: currentRole === 'user' ? 'assistant' : 'user',
                    content: '...'
                });
                messages.push({
                    role: currentRole,
                    content: message.getText()
                });
            }
            lastRole = currentRole;
        });

        if (messages.length > 1 && messages[1].role === 'assistant') {
            logger.debug(`buildRequestBody: Adjusting for conversation starting with an assistant message`);
            messages.splice(1, 0, { role: 'user', content: '...' });
        }

        logger.debug(`buildRequestBody: Request body built successfully`);
        return {
            model: constants.LLM_MODEL,
            messages,
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
        logger.debug('Entering summarizeTextAsBulletPoints');
        const systemMessageContent = 'Please summarize the following text as a list of bullet points:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);
        logger.debug('summarizeTextAsBulletPoints: Request body for summarization built');

        const summaryResponse = await this.sendRequest(requestBody);
        logger.debug('summarizeTextAsBulletPoints: Summary response received');
        return this.processSummaryResponse(summaryResponse.choices[0].text);
    }

    processSummaryResponse(summaryText) {
        logger.debug('Entering processSummaryResponse');
        const bulletPoints = summaryText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
        logger.debug('processSummaryResponse: Processed summary into bullet points');
        return bulletPoints.map(point => point.trim());
    }

    buildRequestBodyForSummarization(text, systemMessageContent) {
        logger.debug('Entering buildRequestBodyForSummarization');
        return {
            model: constants.LLM_MODEL,
            prompt: `${systemMessageContent}\n\n${text}`,
            temperature: 0.5,
            max_tokens: 1024,
            stop: ["\n\n"]
        };
    }

    async summarizeText(text) {
        logger.debug('Entering summarizeText');
        const systemMessageContent = 'Summarize the following text:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);
        logger.debug('summarizeText: Request body for summarization built');

        return await this.sendRequest(requestBody);
    }

    requiresHistory() {
        logger.debug('Entering requiresHistory');
        return true;
    }
}

module.exports = OpenAiManager;
