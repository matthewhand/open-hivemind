const OpenAI = require("openai");
const logger = require('../utils/logger');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage'); // Make sure this path is correct

// Custom replacer function for redacting sensitive information in logs
function redactSensitiveInfo(key, value) {
    if (key === 'apiKey') {
        return `${value.substring(0, 5)}*********${value.slice(-2)}`;
    }
    return value;
}

class OpenAiManager {
    constructor() {
        if (OpenAiManager.instance) {
            return OpenAiManager.instance;
        }
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL
        });
        this.isResponding = false;
        OpenAiManager.instance = this;
    }

    static getInstance() {
        if (!OpenAiManager.instance) {
            OpenAiManager.instance = new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    buildRequestBody(historyMessages = [], systemMessageContent = 'Assist User with their query.') {
        logger.debug('Building request body for OpenAI API call.');

        let messages = [{
            role: 'system',
            content: systemMessageContent,
        }];

        let lastRole = 'system';
        let accumulatedContent = '';

        historyMessages.forEach((message) => {
            if (!(message instanceof IMessage)) {
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }

            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            const messageContent = message.getText();

            if (lastRole !== currentRole && accumulatedContent) {
                messages.push({
                    role: lastRole,
                    content: accumulatedContent.trim(),
                });
                accumulatedContent = '';
            }

            if (messageContent && messageContent.trim() !== '') {
                accumulatedContent += (accumulatedContent ? '\n' : '') + messageContent;
                lastRole = currentRole;
            }
        });

        if (accumulatedContent) {
            messages.push({
                role: lastRole,
                content: accumulatedContent.trim(),
            });
        }

        if (lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: '...', // Placeholder content for ensuring the conversation ends with a user message
            });
        }

        const requestBody = {
            model: constants.LLM_MODEL,
            messages,
        };

        logger.info('Request body for OpenAI API call built successfully.');
        logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
        return requestBody;
    }
                
    async sendRequest(requestBody) {
        logger.debug(`Sending request to OpenAI with body: ${JSON.stringify(requestBody, null, 2)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);
    
            // Attempt to extract the choices array from the response
            let choicesArray = response.choices || (response.data && response.data.choices);
            if (!choicesArray) {
                // Log an error if the expected response structure is not found
                logger.error('API response does not conform to expected structure. Response: ' + JSON.stringify(response, null, 2));
                return [];
            }
    
            // Map over each choice to extract the message content
            let processedResponses = choicesArray.map((choice, index) => {
                const messageContent = choice.message?.content || choice.content;
                if (!messageContent) {
                    logger.error(`Error: Missing content at choice index ${index}.`);
                    return `Error: Missing content at choice index ${index}.`;
                }
                return messageContent.trim();
            });
    
            logger.info('Response processed successfully.');
            logger.debug(`Processed response data: ${JSON.stringify(processedResponses, null, 2)}`);
    
            return processedResponses;
        } catch (error) {
            // Log and rethrow error for the caller to handle
            logger.error(`Error in sendRequest: ${error.message}`);
            throw error;
        }
    }
    
    async summarizeText(userMessage, systemMessageContent = 'Please summarize the following text:') {
        logger.debug('Starting the text summarization process.');
    
        // Constructing the request body with a conversational structure
        let messages = [
            {
                role: 'system',
                content: systemMessageContent
            },
            {
                role: 'user',
                content: userMessage
            }
        ];
    
        const requestBody = {
            model: constants.LLM_MODEL,
            messages: messages,
            temperature: 0.5,
            max_tokens: 420,
            stop: ["\n", " END"]
        };
    
        logger.debug(`Sending summarization request with body: ${JSON.stringify(requestBody, null, 2)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);
    
            let choicesArray = response.choices || (response.data && response.data.choices);
            if (!choicesArray) {
                logger.error('API response does not conform to expected structure. Response: ' + JSON.stringify(response, null, 2));
                return [];
            }
    
            let processedResponses = choicesArray.map((choice, index) => {
                const messageContent = choice.message?.content || choice.content;
                if (!messageContent) {
                    logger.error(`Error: Missing content at choice index ${index}.`);
                    return `Error: Missing content at choice index ${index}.`;
                }
                return messageContent.trim();
            });
    
            logger.info('Summarization processed successfully.');
            logger.debug(`Summarized text: ${processedResponses[0]}`);
    
            return processedResponses;
        } catch (error) {
            logger.error(`Error in text summarization: ${error.message}`);
            throw error;
        }
    }
   
    setIsResponding(isResponding) {
        this.isResponding = isResponding;
        logger.debug(`Set isResponding to ${isResponding}`);
    }

    getIsResponding() {
        return this.isResponding;
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
