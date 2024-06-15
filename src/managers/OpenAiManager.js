const OpenAI = require("openai");
const logger = require('../utils/logger');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage');
const LLMResponse = require('../interfaces/LLMResponse');
const { extractContent, makeOpenAiRequest, completeSentence, needsCompletion, getEmoji } = require('../utils/openAiManagerUtils');
const { handleError, redactSensitiveInfo } = require('../utils/commonUtils');

/**
 * Manages interactions with the OpenAI API, ensuring efficient and correct request handling.
 * This manager maintains a single instance throughout the application to manage state and API interactions.
 */
class OpenAiManager {
    static instance;

    /**
     * Initializes or retrieves the singleton instance of OpenAiManager. It sets up the OpenAI client with the provided API keys and configurations.
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
     * Constructs the request body for OpenAI API calls using the 'messages' format for chat completions.
     * This method structures the conversation history into a format understood by the ChatGPT model.
     *
     * @param {IMessage[]} historyMessages - Array of IMessage instances to provide context.
     * @param {string} systemMessageContent - Initial system message or prompt for the conversation.
     * @param {number} maxTokens - Maximum tokens allowed in the response.
     * @returns {Object} The request body necessary for the API call.
     */
    buildRequestBody(historyMessages = [], systemMessageContent = constants.LLM_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        let messages = [{ role: 'system', content: systemMessageContent }];
        const supportNameField = process.env.LLM_SUPPORT_NAME_FIELD !== 'false';

        if (historyMessages.length > 0 && historyMessages[0].isFromBot() && historyMessages[0].role !== 'user') {
            messages.push({ role: 'user', content: '...' });  // Ensuring logical flow by inserting ellipses when needed
        }

        historyMessages.forEach(message => {
            if (!(message instanceof IMessage)) {
                logger.error("[OpenAiManager.buildRequestBody] Invalid message type, expected IMessage interface.");
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            const authorName = message.getAuthorId(); // using id so name does not confuse the ai

            if (supportNameField) {
                if (messages[messages.length - 1].role !== currentRole || messages[messages.length - 1].name !== authorName) {
                    messages.push({ role: currentRole, content: message.getText(), name: authorName });
                } else {
                    messages[messages.length - 1].content += ` ${message.getText()}`;
                }
            } else {
                if (messages[messages.length - 1].role !== currentRole) {
                    messages.push({ role: currentRole, content: message.getText() });
                } else {
                    messages[messages.length - 1].content += ` ${message.getText()}`;
                }
            }
        });

        if (messages[messages.length - 1].role !== 'user') {
            messages.push({ role: 'user', content: getEmoji() });  // Ensures the conversation ends with a user message
        }

        let requestBody = {
            model: constants.LLM_MODEL,
            messages: messages,
            max_tokens: maxTokens,
            temperature: constants.LLM_TEMPERATURE,
        };

        // Parse LLM_STOP only if it's a non-empty string; otherwise, set it to null
        constants.LLM_STOP = process.env.LLM_STOP ? JSON.parse(process.env.LLM_STOP) : null;

        // Conditionally add the 'stop' parameter only if LLM_STOP is configured and not null
        if (constants.LLM_STOP) {
            requestBody.stop = constants.LLM_STOP;
        }

        return requestBody;
    }

    /**
     * Sends a formatted request to the OpenAI API and handles the response.
     * Manages the 'busy' state to prevent concurrent requests that could lead to conflicts or errors.
     *
     * @param {Object} requestBody - The complete request body with parameters for the API call.
     * @returns {Promise<LLMResponse>} The response from the API, encapsulated in an LLMResponse object.
     */
    async sendRequest(requestBody) {
        if (this.busy) {
            logger.warn('[OpenAiManager.sendRequest] The manager is currently busy with another request.');
            return new LLMResponse("", "busy");
        }

        this.busy = true;
        logger.debug(`[OpenAiManager.sendRequest] Sending request to OpenAI`);
        logger.debug(`[OpenAiManager.sendRequest] Sending request to OpenAI: ${JSON.stringify(requestBody, redactSensitiveInfo, 2)}`);

        try {
            const response = await makeOpenAiRequest(this.openai, requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage.total_tokens;
            let finishReason = response.choices[0].finish_reason;
            let maxTokensReached = tokensUsed >= constants.MAX_TOKENS;

            if (constants.LLM_SUPPORTS_COMPLETIONS && needsCompletion(maxTokensReached, finishReason, content)) {
                logger.info('[OpenAiManager.sendRequest] Completing the response due to reaching the token limit or incomplete sentence.');
                content = await completeSentence(this.openai, content, constants);
            } else {
                logger.debug('[OpenAiManager.sendRequest] Sentence needs completion but LLM_SUPPORTS_COMPLETIONS is disabled.');
            }

            return new LLMResponse(content, finishReason, tokensUsed);
        } catch (error) {
            handleError(error);
            return new LLMResponse("", "error");
        } finally {
            this.busy = false;
            logger.debug('[OpenAiManager.sendRequest] Set busy to false after processing the request.');
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
     * Indicates whether the manager requires a history of messages to function properly.
     * This is typically true for context management in conversational models.
     * @returns {boolean} Always true, as history is necessary for context.
     */
    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
