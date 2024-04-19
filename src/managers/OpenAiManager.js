const OpenAI = require("openai");
const logger = require('../utils/logger');
const { handleError } = require('../utils/handleError');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage');
const LLMResponse = require('../interfaces/LLMResponse');
const { redactSensitiveInfo } = require('../utils/commonUtils'); 
const { summarize } = require('../utils/openAiManagerUtils'); 

class OpenAiManager {
    static instance;

    static emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '😘', '😗', '😙', '😚', '😋',
        '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
        '🤖', // Robot emoji
        '👀'  // Eyes-looking emoji
    ];

    constructor() {
        if (OpenAiManager.instance) {
            return OpenAiManager.instance;
        }
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL
        });
        this.busy = false;
        OpenAiManager.instance = this;
    }

    static getInstance() {
        if (!OpenAiManager.instance) {
            new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    buildRequestBody(historyMessages = [], systemMessageContent = constants.LLM_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        let messages = this.initializeMessageList(systemMessageContent);
        this.processHistoryMessages(messages, historyMessages);
        this.finalizeMessageList(messages);

        return {
            model: constants.LLM_MODEL,
            max_tokens: parseInt(maxTokens, 10),
            messages
        };
    }

    initializeMessageList(systemMessageContent) {
        return [{
            role: 'system',
            content: systemMessageContent
        }];
    }

    processHistoryMessages(messages, historyMessages) {
        let lastRole = 'system';
        let accumulatedContent = '';

        historyMessages.forEach((message) => {
            if (!(message instanceof IMessage)) {
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }

            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            if (lastRole !== currentRole) {
                if (accumulatedContent) {
                    messages.push({
                        role: lastRole,
                        content: accumulatedContent.trim(),
                    });
                    accumulatedContent = '';
                }
                lastRole = currentRole;
            }

            accumulatedContent += `${accumulatedContent ? '\n' : ''}${message.getText()}`;
        });

        if (accumulatedContent) {
            messages.push({
                role: lastRole,
                content: accumulatedContent.trim(),
            });
        }
    }

    finalizeMessageList(messages) {
        if (messages.length > 1 && messages[1].role === 'assistant') {
            const randomEmoji = OpenAiManager.emojis[Math.floor(Math.random() * OpenAiManager.emojis.length)];
            messages.splice(1, 0, { role: 'user', content: `...` });  // Insert ellippses 
        }

        if (messages[messages.length - 1].role !== 'user') {
            const randomEmoji = OpenAiManager.emojis[Math.floor(Math.random() * OpenAiManager.emojis.length)];
            messages.push({ role: 'user', content: `${randomEmoji}` });  // Ensure it ends with a user message with an emoji
        }
    }

    async sendRequest(requestBody) {
        logger.debug(`Preparing to send request to OpenAI with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 3)}`);
    
        if (!this.openai || typeof this.openai.completions.create !== 'function') {
            logger.error('OpenAI API client is not properly instantiated.');
            return new LLMResponse("", "error");
        }
    
        if (this.busy) {
            logger.debug('OpenAiManager is currently busy.');
            return new LLMResponse("", "busy");
        }
    
        this.busy = true;
    
        try {
            if (typeof requestBody !== 'object' || requestBody instanceof Promise) {
                logger.error('Invalid request body: Expected a fully-resolved object.');
                this.busy = false;
                return new LLMResponse("", "error");
            }
    
            logger.debug(`Sending request to OpenAI with fully formed body: ${JSON.stringify(requestBody, redactSensitiveInfo, 3)}`);
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, redactSensitiveInfo, 3)}`);
    
            if (!response || !response.choices || response.choices.length === 0 || !response.choices[0].message || !response.choices[0].message.content) {
                logger.error('No valid message content was returned in the API response.');
                this.busy = false;
                return new LLMResponse("", "error");
            }
    
            const messageContent = response.choices[0].message.content;
            const finishReason = response.choices[0].finish_reason;
    
            logger.debug(`Processing completion with reason: ${finishReason}`);
            return new LLMResponse(messageContent, finishReason || "unknown", response.usage.total_tokens);
        } catch (error) {
            handleError(error);
            this.busy = false;
            logger.error(`An error occurred while sending request to OpenAI: ${error.message}`, { errorDetail: error, requestBody });
            return new LLMResponse("", "error");
        } finally {
            this.busy = false;
            logger.debug('Set busy to false after processing OpenAI request.');
        }
    }
    
    isBusy() {
        return this.busy;
    }

    requiresHistory() {
        return true;
    }

    
    /**
     * Utilizes the OpenAI API to summarize text based on user input.
     *
     * @param {string} userMessage The user's message to summarize.
     * @param {string} [systemMessageContent="Please summarize this text:"] Prompt message for AI.
     * @param {number} [maxTokens=150] Max number of tokens to generate.
     * @returns {Promise<LLMResponse>} The summarized text wrapped in a response object.
     */
     async summarizeText(userMessage, systemMessageContent = constants.LLM_SUMMARY_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        this.busy = true;
        try {
            const response = await summarize(this.openai, userMessage, systemMessageContent, maxTokens);
            return response;
        } catch (error) {
            handleError(error);
            return new LLMResponse("", "error", 0);
        } finally {
            this.busy = false;
        }
    }
}

module.exports = OpenAiManager;
