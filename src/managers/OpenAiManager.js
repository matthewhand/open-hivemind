const OpenAI = require("openai");
const logger = require('../utils/logger');
const { handleError } = require('../utils/handleError');
const constants = require('../config/constants');
const IMessage = require('../interfaces/IMessage');
const LLMResponse = require('../interfaces/LLMResponse'); 

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

    buildRequestBody(historyMessages = [], systemMessageContent = constants.LLM_SYSTEM_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        logger.debug('Building request body for OpenAI API call.');

        let messages = [{
            role: 'system',
            content: systemMessageContent, 
        }];
    
        let lastRole = 'system';
        let accumulatedContent = '';
    
        historyMessages.forEach((message, index) => {
            // Ensure the message is an instance of IMessage or similar for correct interface
            if (!(message instanceof IMessage)) {
                throw new Error("All history messages must be instances of IMessage or its subclasses.");
            }
    
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
    
            // If last role was 'system' and the current role is 'assistant', insert a placeholder user message
            if (lastRole === 'system' && currentRole === 'assistant') {
                messages.push({
                    role: 'user',
                    content: '...', // Placeholder user content
                });
            }
    
            if (lastRole !== currentRole) {
                // When role changes, push accumulated content for the last role and reset accumulator
                if (accumulatedContent) {
                    messages.push({
                        role: lastRole,
                        content: accumulatedContent.trim(),
                    });
                    accumulatedContent = '';
                }
                lastRole = currentRole;
            }
    
            // Accumulate content from consecutive messages of the same role
            accumulatedContent += (accumulatedContent ? '\n' : '') + message.getText();
        });
    
        // After iterating, if there's any remaining content, push it as the last message
        if (accumulatedContent) {
            messages.push({
                role: lastRole,
                content: accumulatedContent.trim(),
            });
        }
    
        // Always ensure the conversation ends with a 'user' role message
        if (lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: '...', // Placeholder content for a final 'user' message
            });
        }
    
        const requestBody = {
            model: constants.LLM_MODEL,
            max_tokens: parseInt(maxTokens, 10),
            messages,
        };
    
        logger.info('Request body for OpenAI API call built successfully.');
        logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
    
        return requestBody;
    }
                        
    async sendRequest(requestBody) {
        logger.debug(`Sending request to OpenAI with body: ${JSON.stringify(requestBody, redactSensitiveInfo, 3)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, redactSensitiveInfo, 3)}`);
            
            if (!response.choices || response.choices.length === 0) {
                logger.error('No choices were returned in the API response.');
                return new LLMResponse("", "error");
            }
            
            const firstChoice = response.choices[0];
            const messageContent = firstChoice.text || firstChoice.message?.content || "";
            
            if (!messageContent) {
                logger.error('No valid message content was returned in the API response.');
                return new LLMResponse("", "error");
            }

            return new LLMResponse(messageContent, firstChoice.finish_reason || "unknown", response.usage.completion_tokens);
        } catch (error) {
            handleError(error);
            return new LLMResponse("", "error"); // Ensure a consistent return type
        } finally {
            this.isResponding = false;
            logger.debug('Set isResponding to false');
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
