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
        systemMessageContent = systemMessageContent || constants.LLM_SYSTEM_PROMPT;
        logger.debug(`buildRequestBody: Using system message content: ${systemMessageContent}`);

        let messages = [{
            role: 'system',
            content: systemMessageContent
        }];

        historyMessages.reverse();
        logger.debug('buildRequestBody: History messages reversed for processing');

        let lastRole = 'user'; // Default to user to ensure the first message after system is user

        historyMessages.forEach((message, index) => {
            const currentRole = message.isFromBot ? 'assistant' : 'user';
            logger.debug(`buildRequestBody: Processing message ${index} with role ${currentRole}`);

            if (constants.LLM_PADDING_ALTERNATION && lastRole === currentRole) {
                // Insert padding if consecutive messages are from the same role
                messages.push({
                    role: 'user',
                    content: constants.LLM_PADDING_CONTENT || '...'
                });
            }

            messages.push({
                role: currentRole,
                content: message.getText()
            });
            lastRole = currentRole;
        });

        // Ensure the last message is from a user, if required by configuration
        if (constants.LLM_PADDING_END_WITH_USER && lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: constants.LLM_PADDING_CONTENT || '...'
            });
        }

        logger.info('OpenAI API request body built successfully');
        return {
            model: constants.LLM_MODEL,
            messages,
        };
    }    
    
    async summarizeTextAsBulletPoints(text) {
        logger.debug('Entering summarizeTextAsBulletPoints');
        const systemMessageContent = 'Please summarize the following text as a list of bullet points:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);

        // Before calling this.sendRequest(requestBody) in your code where you prepare the request
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('summarizeTextAsBulletPoints: Request body is empty or invalid.');
            return; // Skip sending request
        } else {
            logger.debug(`summarizeTextAsBulletPoints: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
        }

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

        // Before calling this.sendRequest(requestBody) in your code where you prepare the request
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('summarizeText: Request body is empty or invalid.');
            return; // Skip sending request
        } else {
            logger.debug(`summarizeText: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
        }

        return await this.sendRequest(requestBody);
    }

    requiresHistory() {
        logger.debug('Entering requiresHistory');
        return true;
    }
}

module.exports = OpenAiManager;
