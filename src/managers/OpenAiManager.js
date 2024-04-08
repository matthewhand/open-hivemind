const OpenAI = require("openai");
const logger = require('../utils/logger');
const handleError = require('../utils/handleError');
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

    buildRequestBody(historyMessages = [], systemMessageContent = 'Assist User with their query.') {
        // Prepend or append the LLM_SYSTEM_PROMPT to the system message content
        const fullSystemMessageContent = `${constants.LLM_SYSTEM_PROMPT}\n${systemMessageContent}`;

        logger.debug('Building request body for OpenAI API call.');

        let messages = [{
            role: 'system',
            content: fullSystemMessageContent, 
        },
        {
            role: 'user',
            content: historyMessages
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
            // max_tokens: 420, // TODO configure as const/envvar
            max_tokens: 69,
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
            // Create and return an instance of LLMResponse
            return new LLMResponse(firstChoice.message?.content || "", firstChoice.finish_reason || "unknown", response.usage.completion_tokens);
        } catch (error) {
            handleError(error);
            return new LLMResponse("", "error"); // Ensure a consistent return type
        } finally {
            this.isResponding = false;
            logger.debug('Set isResponding to false');
        }
    }
                
    async summarizeText(userMessage, systemMessageContent = 'Generate a brief version (don’t apologize):', maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
        logger.debug('Starting the text summarization process.');
    
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
            temperature: 0.7,
            max_tokens: parseInt(maxTokens, 10)
        };
    
        logger.debug(`Sending summarization request with body: ${JSON.stringify(requestBody, null, 3)}`);
        try {
            const response = await this.openai.completions.create(requestBody);
            logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);
    
            if (!response.choices || response.choices.length === 0) {
                logger.error('No choices were returned in the API response.');
                return { summary: '', finishReason: 'error' };
            }
    
            const firstChoice = response.choices[0];
            const summary = firstChoice.message?.content || firstChoice.content || '';
            const finishReason = firstChoice.finish_reason;
    
            if (!summary) {
                logger.error('Error: Missing content in the first choice.');
                return { summary: '', finishReason: 'error' };
            }
    
            logger.info('Summarization processed successfully.');
            logger.debug(`Summarized text: ${summary}`);
            
            return { summary, finishReason };
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
