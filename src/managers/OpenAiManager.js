const OpenAI = require("openai");
const logger = require('../utils/logger');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage');
const LLMResponse = require('../interfaces/LLMResponse');
const { extractContent, makeOpenAiRequest, completeSentence, needsCompletion, getEmoji } = require('../utils/openAiManagerUtils');
const { handleError, redactSensitiveInfo } = require('../utils/commonUtils');

/**
 * Singleton class for managing interactions with the OpenAI API. Ensures efficient handling
 * of API requests with a single instance and manages 'busy' state to avoid concurrent request issues.
 */
class OpenAiManager {
    static instance;

    /**
     * Constructs an instance of OpenAiManager, setting up the OpenAI client with necessary API keys
     * and configurations, implementing the singleton pattern to ensure a single instance is used.
     */
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

    /**
     * Retrieves the singleton instance of OpenAiManager.
     * @returns {OpenAiManager} The singleton instance.
     */
    static getInstance() {
        if (!OpenAiManager.instance) {
            new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    /**
     * Builds the request body for the OpenAI API from provided input parameters. This method structures
     * messages correctly in the system-user-assistant-user format by inserting necessary ellipses to ensure
     * the conversation flows naturally and logically.
     *
     * @param {Array<IMessage>} historyMessages - Array of prior messages to provide contextual background.
     * @param {string} systemMessageContent - Initial system message or prompt for the conversation.
     * @param {number} maxTokens - Maximum tokens allowed in the API response.
     * @returns {Object} - The constructed request body for the API call.
     */
    buildRequestBody(historyMessages = [], systemMessageContent = constants.LLM_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        let messages = [{
            role: 'system',
            content: systemMessageContent
        }];

        historyMessages.forEach((message, index) => {
            if (!(message instanceof IMessage)) {
                logger.error("[OpenAiManager.buildRequestBody] Invalid message type, expected IMessage interface.");
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            if (messages[messages.length - 1].role !== currentRole) {
                messages.push({ role: currentRole, content: message.getText() });
            } else {
                messages[messages.length - 1].content += ` ${message.getText()}`;
            }
        });

        // Append ellipses when transitioning from system to assistant without a user in between
        if (messages.length > 1 && messages[1].role === 'assistant') {
            messages.splice(1, 0, { role: 'user', content: '...' });
        }

        if (messages[messages.length - 1].role !== 'user') {
            messages.push({ role: 'user', content: getEmoji() });  // Ensures the conversation always ends with a user message (Emoji)
        }

        return {
            model: constants.LLM_MODEL,
            prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
            max_tokens: maxTokens,
            temperature: 0.5  // Set a neutral temperature for balanced creativity
        };
    }

    /**
     * Sends a request to the OpenAI API to generate text completions and handles the response.
     * Manages the 'busy' state to prevent handling multiple requests simultaneously, which could lead to conflicts.
     *
     * @param {Object} requestBody - The data to be sent in the request to OpenAI.
     * @returns {Promise<LLMResponse>} A promise that resolves to the response from the OpenAI API.
     */
    async sendRequest(requestBody) {
        logger.debug(`[OpenAiManager.sendRequest] Preparing to send request with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 4)}`);

        if (this.busy) {
            logger.info('[OpenAiManager.sendRequest] Manager is currently busy.');
            return new LLMResponse("", "busy");
        }

        this.busy = true;
        try {
            const response = await makeOpenAiRequest(this.openai, requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage.total_tokens;
            let finishReason = response.choices[0].finish_reason;
            let maxTokensReached = tokensUsed >= constants.MAX_TOKENS;

            if (needsCompletion(maxTokensReached, finishReason, content)) {
                content = await completeSentence(this.openai, content, constants);
                logger.debug('[OpenAiManager.sendRequest] Sentence completion executed.');
            }

            logger.debug(`[OpenAiManager.sendRequest] Request processed with finish reason: ${finishReason}, and tokens used: ${tokensUsed}.`);
            return new LLMResponse(content, finishReason, tokensUsed);
        } catch (error) {
            logger.error('[OpenAiManager.sendRequest] Error processing OpenAI request:', error);
            handleError(error, "OpenAiManager.sendRequest");
            return new LLMResponse("", "error");
        } finally {
            this.busy = false;
            logger.debug('[OpenAiManager.sendRequest] Set busy to false after request processing.');
        }
    }

        /**
     * Summarizes text using the OpenAI model based on the provided user message and system prompt.
     * This method constructs a request to the OpenAI API to summarize the text and manages the summarization process.
     *
     * @param {string} userMessage - The user's message to summarize.
     * @param {string} [systemMessageContent=constants.LLM_SUMMARY_SYSTEM_PROMPT] - System prompt to use for the summary.
     * @param {number} [maxTokens=constants.LLM_SUMMARY_MAX_TOKENS] - Maximum number of tokens that the model can use.
     * @returns {Promise<LLMResponse>} - The summarized text response encapsulated in an LLMResponse object.
     */
        async summarizeText(userMessage, systemMessageContent = constants.LLM_SUMMARY_SYSTEM_PROMPT, maxTokens = constants.LLM_SUMMARY_MAX_TOKENS) {
            logger.debug(`[OpenAiManager.summarizeText] Initializing text summarization for message: ${userMessage}`);
    
            if (this.busy) {
                logger.info('[OpenAiManager.summarizeText] Manager is currently busy.');
                return new LLMResponse("", "busy");
            }
    
            this.busy = true;
            const prompt = `${systemMessageContent}\n\nUser: ${userMessage}\nAssistant:`;
            const requestBody = {
                model: constants.LLM_MODEL,
                prompt: prompt,
                max_tokens: maxTokens,
                temperature: 0.5  // Reasonable default for generating natural completions.
            };
    
            try {
                logger.debug(`[OpenAiManager.summarizeText] Sending summarization request with prompt: ${prompt}`);
                const response = await makeOpenAiRequest(this.openai, requestBody);
                const summary = extractContent(response.choices[0]);
                logger.debug('[OpenAiManager.summarizeText] Summary processed successfully.');
    
                return new LLMResponse(summary, "completed", response.usage.total_tokens);
            } catch (error) {
                logger.error('[OpenAiManager.summarizeText] Error during text summarization:', error);
                handleError(error);
                return new LLMResponse("", "error", 0);
            } finally {
                this.busy = false;
                logger.debug('[OpenAiManager.summarizeText] Set busy to false after summarization.');
            }
        }
    
        /**
         * Checks if the manager is currently processing a request.
         * @returns {boolean} True if the manager is busy, false otherwise.
         */
        isBusy() {
            return this.busy;
        }
    
        /**
         * Determines if the manager requires a history of messages to function properly, which it does,
         * for context management in conversations.
         * @returns {boolean} Always true, as history is necessary for context in model interactions.
         */
        requiresHistory() {
            return true;
        }
    }
    
    module.exports = OpenAiManager;
    