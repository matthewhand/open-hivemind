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
        if (OpenAiManager.instance) {
            return OpenAiManager.instance; // Return the existing instance if it exists
        }
        this.isResponding = false;
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL
        });
        OpenAiManager.instance = this; // Assign this new instance to the static instance property

        logger.debug(`Initializing OpenAiManager with API key: ${constants.LLM_API_KEY.substring(0, 5)}... and API endpoint: ${constants.LLM_ENDPOINT_URL}`);
        logger.debug(`OpenAiManager initialized with custom API endpoint. apiKey: ${JSON.stringify({apiKey: constants.LLM_API_KEY}, redactSensitiveInfo, 2)}`);
    }
    static getInstance() {
        if (!OpenAiManager.instance) {
            OpenAiManager.instance = new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    async sendRequest(requestBody) {
        logger.debug(`Sending request with body: ${JSON.stringify(requestBody, null, 2)}`);
    
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);
    
            // Generalize the response structure check
            let choicesArray;
            if (response.choices) {
                choicesArray = response.choices;
            } else if (response.data && Array.isArray(response.data.choices)) { // TODO update cloudflare worker endpoint
                choicesArray = response.data.choices;
            } else {
                logger.error('API response does not conform to expected structure.');
                return [];
            }
    
            let processedResponses = choicesArray.map((choice, index) => {
                // Adapt to the structure of 'message' based on your API's response
                const messageContent = choice.message?.content || choice.content;
                if (!messageContent) {
                    return `Error: Missing content at choice index ${index}.`;
                }
                return messageContent;
            });
    
            logger.info('Response processed successfully.');
            logger.debug(`Processed response data: ${JSON.stringify(processedResponses, null, 2)}`);
    
            return processedResponses;
        } catch (error) {
            logger.error(`Failed to send request: ${error.message}`);
            logger.debug(`Error stack: ${error.stack}`);
            throw error;
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
        logger.debug('Starting text summarization.');
    
        const requestBody = {
            model: constants.LLM_MODEL,
            prompt: `Summarize the following text: ${text}`,
            temperature: 0.5,
            max_tokens: 200, // Adjust based on your requirements
            stop: ["\n", " END"],
        };
    
        try {
            const response = await this.sendRequest({ ...requestBody });
            logger.debug(`Received summarization response: ${JSON.stringify(response)}`);
    
            if (!response || response.length === 0) {
                logger.warn('Empty response from summarization request.');
                return [];
            }
            return response;
        } catch (error) {
            logger.error(`Error during text summarization: ${error.message}`);
            throw new Error('Summarization failed.');
        }
    }

    requiresHistory() {
        logger.debug('Entering requiresHistory');
        return true;
    }
}

module.exports = OpenAiManager;
