const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        this.botId = null; // This will be set externally
        this.retryDelay = 5000; // Delay in milliseconds for retry
        this.maxRetries = 5; // Maximum number of retries
    }

    async ensureBotId() {
        let retries = 0;
        while (!this.botId && retries < this.maxRetries) {
            logger.warn(`Bot ID not set in OpenAiManager, retrying in ${this.retryDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            retries++;
        }
        if (!this.botId) {
            logger.error(`Failed to set Bot ID after ${this.maxRetries} retries.`);
            throw new Error("Bot ID not set in OpenAiManager after retries");
        }
    }

    async sendRequest(requestBody) {
        await this.ensureBotId(); // Ensure botId is set before proceeding

        try {
            logger.debug(`Sending OAI API Request with bot ID ${this.botId}: ${JSON.stringify(requestBody, null, 2)}`);
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${constants.LLM_API_KEY}`,
            };
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, { headers });
            logger.debug(`Received OAI API Response: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Error in OAI API request: ${error.message}`, { error });
            throw error;
        }
    }

    buildRequestBody(historyMessages) {
        if (!this.botId) {
            logger.warn("Bot ID is not available at the time of building request body. Attempting to ensure Bot ID is set...");
            this.ensureBotId().catch(error => {
                logger.error("Failed to ensure Bot ID is set:", error.message);
                throw error;
            });
        }

        const systemMessage = constants.LLM_SYSTEM_PROMPT ? {
            role: 'system',
            content: constants.LLM_SYSTEM_PROMPT
        } : null;

        let messages = systemMessage ? [systemMessage] : [];
        messages = messages.concat(historyMessages.map(msg => ({
            role: msg.authorId === this.botId ? 'assistant' : 'user',
            content: msg.content
        })));

        return {
            model: constants.LLM_MODEL,
            messages,
            temperature: constants.LLM_TEMPERATURE,
            max_tokens: constants.LLM_MAX_TOKENS,
            top_p: constants.LLM_TOP_P,
            frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
            presence_penalty: constants.LLM_PRESENCE_PENALTY,
        };
    }

    setBotId(botId) {
        logger.debug(`Setting bot ID in OpenAiManager: ${botId}`);
        this.botId = botId;
    }

    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
