const OpenAI = require("openai");
const logger = require('../utils/logger');
const constants = require('../config/constants');

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

    buildRequestBody(historyMessages, systemMessageContent) {
        logger.debug('Building request body for OpenAI API call.');

        let messages = historyMessages.map(msg => ({
            role: msg.isFromBot ? 'assistant' : 'user',
            content: msg.getText()
        }));

        // Prepend the system message if provided
        if (systemMessageContent) {
            messages.unshift({
                role: 'system',
                content: systemMessageContent
            });
        }

        logger.debug(`Request body built with ${messages.length} messages.`);
        return {
            model: constants.LLM_MODEL,
            messages: messages,
        };
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
    
    async summarizeText(text) {
        const prompt = `Summarize the following text:\n\n${text}`;
        const requestBody = {
            model: constants.LLM_MODEL,
            prompt: prompt,
            temperature: 0.5,
            max_tokens: 200,
            stop: ["\n", " END"],
        };
        return await this.sendRequest(requestBody);
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
