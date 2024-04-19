const OpenAI = require("openai");
const logger = require('../utils/logger');
const { handleError } = require('../utils/handleError');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage');
const LLMResponse = require('../interfaces/LLMResponse'); 
const { redactSensitiveInfo } = require('../utils/commonUtils');  // Importing the common utility function

class OpenAiManager {
    static instance;

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
            OpenAiManager.instance = new OpenAiManager();
        }
        return OpenAiManager.instance;
    }


    /**
     * Constructs the request body for the OpenAI API call based on the history of messages and the system message content.
     * @param {IMessage[]} historyMessages - Array of historical IMessage instances for context.
     * @param {string} systemMessageContent - The system directive or prompt to guide the conversation.
     * @param {number} maxTokens - Maximum tokens to generate in the response.
     * @returns {Object} The structured request body for the API call.
     */
    buildRequestBody(historyMessages = [], systemMessageContent = constants.LLM_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        logger.debug('Building request body for OpenAI API call.');

        let messages = [{
            role: 'system',
            content: systemMessageContent,
        }];

        // This will hold the last role that was added to the messages array
        let lastRole = 'system';

        historyMessages.forEach((message) => {
            if (!(message instanceof IMessage)) {
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }

            const currentRole = message.isFromBot() ? 'assistant' : 'user';

            // Only add a new message object when the role changes
            if (lastRole !== currentRole) {
                // Add accumulated content as a new message if there's any content present
                if (message.getText().trim()) {
                    messages.push({
                        role: currentRole,
                        content: message.getText().trim()
                    });
                }
                lastRole = currentRole; // Update the lastRole to the current role
            } else {
                // If the role didn't change, append the text to the last message object
                messages[messages.length - 1].content += `\n${message.getText().trim()}`;
            }
        });

        const requestBody = {
            model: constants.LLM_MODEL,
            max_tokens: parseInt(maxTokens, 10),
            messages
        };

        logger.info('Request body for OpenAI API call built successfully.');
        logger.debug(`Request body: ${JSON.stringify(requestBody, redactSensitiveInfo, 2)}`);

        return requestBody;
    }
    
/**
 * Sends a request to the OpenAI API and handles the response.
 * Ensures that the OpenAI client is properly instantiated and manages the busy state to avoid concurrent modifications.
 *
 * @param {Object} requestBody - The fully formed request body to send to the API.
 * @returns {LLMResponse} - An object containing the response data or an error message.
 */
async sendRequest(requestBody) {
    logger.debug(`Preparing to send request to OpenAI with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 3)}`);

    // Check if the OpenAI API client instance is ready
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
        // Ensuring requestBody is not a Promise and is properly formed
        if (typeof requestBody !== 'object' || requestBody instanceof Promise) {
            logger.error('Invalid request body: Expected a fully-resolved object.');
            this.busy = false;
            return new LLMResponse("", "error");
        }

        // Debugging final requestBody to be sent
        logger.debug(`Sending request to OpenAI with fully formed body: ${JSON.stringify(requestBody, redactSensitiveInfo, 3)}`);

        const response = await this.openai.completions.create(requestBody);
        logger.debug(`Raw API response: ${JSON.stringify(response, redactSensitiveInfo, 3)}`);

        if (!response.choices || response.choices.length === 0) {
            logger.error('No choices were returned in the API response.');
            this.busy = false;
            return new LLMResponse("", "error");
        }

        const firstChoice = response.choices[0];
        const messageContent = firstChoice.text || firstChoice.message?.content || "";

        if (!messageContent) {
            logger.error('No valid message content was returned in the API response.');
            this.busy = false;
            return new LLMResponse("", "error");
        }

        logger.debug(`Processing completion with reason: ${firstChoice.finish_reason}`);
        return new LLMResponse(messageContent, firstChoice.finish_reason || "unknown", response.usage.total_tokens);
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

    /**
     * Summarizes the given text by sending a request to the OpenAI API.
     * The function constructs a specific payload to encourage the model
     * to adjust and shorten the provided text, optionally embellishing it
     * with emojis as per the user's request.
     *
     * @param {string} userMessage - The original message provided by the user.
     * @param {string} [systemMessageContent="Adjust text as per User requirement. Respond with only the revised message."] - The system message to guide the OpenAI model.
     * @param {number} [maxTokens=constants.LLM_RESPONSE_MAX_TOKENS] - The maximum number of tokens allowed for the OpenAI response.
     * @returns {Promise<LLMResponse>} - An LLMResponse object containing the summarized text, finish reason, and the number of tokens used.
     */
    async summarizeText(userMessage, systemMessageContent = constants.LLM_SUMMARY_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        logger.debug('Starting the text summarization process.');

        let messages = [
            {
                role: 'system',
                content: systemMessageContent
            },
            {
                role: 'user',
                content: "Please make it shorter"
            },
            {
                role: 'assistant',
                content: userMessage
            },
            {
                role: 'user',
                content: "Add an emoji or two."
            }
        ];

        const requestBody = {
            model: constants.LLM_MODEL,
            messages: messages,
            temperature: 0.2,
            max_tokens: parseInt(maxTokens, 10)
        };

        logger.debug(`Sending summarization request with body: ${JSON.stringify(requestBody, null, 3)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);

            if (!response.choices || response.choices.length === 0) {
                logger.error('No choices were returned in the API response.');
                return new LLMResponse("", "error", 0);
            }

            const firstChoice = response.choices[0];
            const summary = firstChoice.text || ''; // Ensure to use 'text' as per the response structure
            const finishReason = firstChoice.finish_reason;

            if (!summary) {
                logger.error('Error: Missing text in the first choice.');
                return new LLMResponse("", "error", 0);
            }

            logger.info('Summarization processed successfully.');
            logger.debug(`Summarized text: ${summary}`);

            return new LLMResponse(summary, finishReason, response.usage.completion_tokens);
        } catch (error) {
            logger.error(`Error in text summarization: ${error.message}`);
            return new LLMResponse("", "error", 0); // Error handling, ensuring a consistent return type
        }
    }
    
    isBusy() {
        return this.busy;
    }

    requiresHistory() {
        return true;
    }

}

module.exports = OpenAiManager;
