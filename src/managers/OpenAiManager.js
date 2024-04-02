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
        logger.debug(`Sending request to OpenAI with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 2)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Received response from OpenAI: ${JSON.stringify(response.data, null, 2)}`);
            return response.data.choices.map(choice => choice.text.trim());
        } catch (error) {
            logger.error(`Error in sendRequest: ${error.message}`);
            throw error; // Rethrow the error for caller to handle
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
