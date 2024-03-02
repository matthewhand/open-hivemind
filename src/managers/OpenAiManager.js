// Updated import statement
const OpenAI = require("openai");

const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
    constructor() {
        super();
        this.isResponding = false;
        // Updated OpenAI client instantiation
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
        });
        logger.debug('OpenAiManager initialized');
    }
    
    setIsResponding(state) {
        this.isResponding = state;
        logger.debug(`setIsResponding: State set to ${state}`);
    }

    getIsResponding() {
        logger.debug(`getIsResponding: Returning ${this.isResponding}`);
        return this.isResponding;
    }

    async sendRequest(requestBody) {
        logger.debug('Sending request to OpenAI API');
        try {
            // Assuming requestBody already contains the structured data for the API call
            const response = await this.openai.completions.create(requestBody);
            logger.info('Response received from OpenAI API.');
            logger.debug('OpenAI API response:', response.data);
            return response.data;
        } catch (error) {
            const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
            logger.error(errMsg, { error });
            throw new Error(errMsg);
        }
    }    

    buildRequestBody(historyMessages, systemMessageContent = null) {
        logger.debug('Entering buildRequestBody');
        systemMessageContent = systemMessageContent || constants.LLM_SYSTEM_PROMPT;
        logger.debug(`buildRequestBody: Using system message content: ${systemMessageContent}`);
    
        let messages = [{
            role: 'system',
            content: systemMessageContent
        }];
    
        let lastRole = 'system';
        let accumulatedContent = ''; // To accumulate content from the same role
    
        // Ensure the first message after "system" is from a "user"
        if (historyMessages.length > 0 && historyMessages[0].isFromBot()) {
            messages.push({
                role: 'user',
                content: constants.LLM_PADDING_CONTENT || '...' // Padding content for the user
            });
            lastRole = 'user'; // Update lastRole since we just added a user padding message
        }
    
        historyMessages.forEach((message, index) => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
    
            // If the last message role is not the same as the current, push the accumulated content (if any) and reset
            if (lastRole !== currentRole && accumulatedContent) {
                messages.push({
                    role: lastRole,
                    content: accumulatedContent.trim() // Trim any leading/trailing newline characters
                });
                accumulatedContent = ''; // Reset accumulated content
            }
    
            // Accumulate content with a newline if not the first addition
            accumulatedContent += (accumulatedContent ? '\n' : '') + message.getText();
    
            lastRole = currentRole; // Update the lastRole for the next iteration
        });
    
        // After the loop, add any remaining accumulated content
        if (accumulatedContent) {
            messages.push({
                role: lastRole,
                content: accumulatedContent.trim()
            });
        }
    
        // Ensure the conversation ends with a user message if the last message was from the assistant
        if (lastRole === 'assistant') {
            messages.push({
                role: 'user',
                content: constants.LLM_PADDING_CONTENT || '...'
            });
        }
    
        logger.info('OpenAI API request body built successfully');
        return {
            model: constants.LLM_MODEL,
            messages,
        };
    }
                    
    async summarizeTextAsBulletPoints(text) {
        logger.debug('Entering summarizeTextAsBulletPoints');
        const systemMessageContent = 'Please summarize the following text as a list of bullet points:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);

        // Before calling this.sendRequest(requestBody) in your code where you prepare the request
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('summarizeTextAsBulletPoints: Request body is empty or invalid.');
            return; // Skip sending request
        } else {
            logger.debug(`summarizeTextAsBulletPoints: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
        }

        const summaryResponse = await this.sendRequest(requestBody);
        logger.debug('summarizeTextAsBulletPoints: Summary response received');
        return this.processSummaryResponse(summaryResponse.choices[0].text);
    }

    processSummaryResponse(summaryText) {
        logger.debug('Entering processSummaryResponse');
        const bulletPoints = summaryText.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
        logger.debug('processSummaryResponse: Processed summary into bullet points');
        return bulletPoints.map(point => point.trim());
    }

    buildRequestBodyForSummarization(text, systemMessageContent) {
        logger.debug('Entering buildRequestBodyForSummarization');
        return {
            model: constants.LLM_MODEL,
            prompt: `${systemMessageContent}\n\n${text}`,
            temperature: 0.5,
            max_tokens: 1024,
            stop: ["\n\n"]
        };
    }

    async summarizeText(text) {
        logger.debug('Entering summarizeText');
        const systemMessageContent = 'Summarize the following text:';
        const requestBody = this.buildRequestBodyForSummarization(text, systemMessageContent);
        logger.debug('summarizeText: Request body for summarization built');

        // Before calling this.sendRequest(requestBody) in your code where you prepare the request
        if (!requestBody.messages || requestBody.messages.length === 0) {
            logger.error('summarizeText: Request body is empty or invalid.');
            return; // Skip sending request
        } else {
            logger.debug(`summarizeText: Request body is - ${JSON.stringify(requestBody.messages, null, 2)}`);
        }

        return await this.sendRequest(requestBody);
    }

    requiresHistory() {
        logger.debug('Entering requiresHistory');
        return true;
    }
}

module.exports = OpenAiManager;
