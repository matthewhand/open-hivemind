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

    async sendRequest(requestBody) {
        const url = constants.LLM_ENDPOINT_URL;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${constants.LLM_API_KEY}`,
        };

        logger.debug(`Sending request to OpenAI API: ${url}`)

        try {
            logger.debug(`Final request body being sent: ${JSON.stringify(requestBody, null, 2)}`);
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

    buildRequestBody(historyMessages, systemMessageContent = null) {
        logger.debug('Entering buildRequestBody');
        systemMessageContent = systemMessageContent || constants.LLM_SYSTEM_PROMPT;
        logger.debug(`buildRequestBody: Using system message content: ${systemMessageContent}`);
    
        let messages = [{
            role: 'system',
            content: systemMessageContent
        }];
    
        let lastRole = 'system'; // The last message role starts as 'system'
    
        historyMessages.forEach((message, index) => {
            // Assume each message has a way to determine if it's from a bot
            const currentRole = message.isFromBot ? 'assistant' : 'user';
    
            // If the last message role is the same as the current, insert padding
            if (lastRole === currentRole) {
                messages.push({
                    role: currentRole === 'user' ? 'assistant' : 'user', // Alternate the role for padding
                    content: constants.LLM_PADDING_CONTENT || '...' // Use a default padding content
                });
            }
    
            messages.push({
                role: currentRole,
                content: message.getText()
            });
    
            lastRole = currentRole; // Update the lastRole to the current message's role
        });
    
        // Ensure the conversation ends with a user message if the last message was from the assistant
        if (lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: constants.LLM_PADDING_CONTENT || '...' // Ensure final message is from the user
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
