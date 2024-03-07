const OpenAI = require("openai");
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

// Custom replacer function for redacting sensitive information
function redactSensitiveInfo(key, value) {
    if (typeof value === 'string' && key === 'apiKey') {
        return `${value.substring(0, 5)}*********${value.slice(-2)}`;
    }
    return value;
}

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        this.isResponding = false;

        logger.debug(`Initializing OpenAiManager with API key: ${constants.LLM_API_KEY.substring(0, 5)}... and API endpoint: ${constants.LLM_ENDPOINT_URL}`);

        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL
        });

        // Use redactSensitiveInfo to safely log the apiKey part
        logger.debug(`OpenAiManager initialized with custom API endpoint. apiKey: ${JSON.stringify({apiKey: constants.LLM_API_KEY}, redactSensitiveInfo, 2)}`);
    }

    // Update all relevant debug logging to include redaction
    async sendRequest(requestBody) {
        // Log the requestBody with redaction
        logger.debug(`Preparing to send request to OpenAI API with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 2)}`);

        try {
            const response = await this.openai.completions.create(requestBody);
            logger.info('Response received from OpenAI API.');

            // Redact sensitive info from the response if necessary
            logger.debug(`OpenAI API response data: ${JSON.stringify(response.data, redactSensitiveInfo, 2)}`);
            return response.data;
        } catch (error) {
            const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
            logger.error(errMsg);
            // Optionally, log the error stack for more detailed debugging
            logger.debug(`Error stack: ${error.stack}`);
            throw new Error(errMsg);
        }
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
        logger.debug('Building request body for OpenAI API call.');
        
        systemMessageContent = systemMessageContent || constants.LLM_SYSTEM_PROMPT;
        logger.debug(`Using system message content: '${systemMessageContent}'`);

        let messages = [{
            role: 'system',
            content: systemMessageContent
        }];
        
        let lastRole = 'system';
        let accumulatedContent = '';
        
        // Log initial state before processing history messages
        logger.debug(`Initial messages array: ${JSON.stringify(messages, null, 2)}`);
        
        historyMessages.forEach((message, index) => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            
            if (lastRole !== currentRole && accumulatedContent) {
                messages.push({
                    role: lastRole,
                    content: accumulatedContent.trim()
                });
                logger.debug(`Pushed accumulated content for role: ${lastRole}, content: '${accumulatedContent.trim()}'`);
                accumulatedContent = '';
            }

            accumulatedContent += (accumulatedContent ? '\n' : '') + message.getText();
            lastRole = currentRole;
        });

        if (accumulatedContent) {
            messages.push({
                role: lastRole,
                content: accumulatedContent.trim()
            });
            logger.debug(`Final push for accumulated content for role: ${lastRole}, content: '${accumulatedContent.trim()}'`);
        }

        if (lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: constants.LLM_PADDING_CONTENT || '...'
            });
            logger.debug("Added user role message at the end to ensure conversation ends with a user message.");
        }
        
        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
        };

        logger.info('Request body for OpenAI API call built successfully.');
        logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
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
