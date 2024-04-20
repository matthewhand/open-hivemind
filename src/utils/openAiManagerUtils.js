const OpenAI = require("openai");
const logger = require('./logger');
const constants = require('../config/constants');
const { handleError } = require('./commonUtils');
const LLMResponse = require('../interfaces/LLMResponse');

/**
 * Processes text summarization using the OpenAI API based on provided parameters.
 * Incorporates a structured message format to interact with the AI model.
 * @param {Object} openai - The OpenAI service client.
 * @param {string} userMessage - User's input message to summarize.
 * @param {string} [systemMessageContent=constants.LLM_SUMMARY_PROMPT] - System's prompt message.
 * @param {number} [maxTokens=constants.LLM_RESPONSE_MAX_TOKENS] - Maximum response tokens.
 * @returns {Promise<LLMResponse>} - The result of the summarization attempt, encapsulated in an LLMResponse object.
 */
async function summarize(openai, userMessage, systemMessageContent = constants.LLM_SUMMARY_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
    logger.debug('Starting the text summarization process.');

    let messages = [
        { role: 'system', content: systemMessageContent },
        { role: 'user', content: `Provide a concise summary of the following text without any additional text or introductions: ${userMessage}`}
    ];

    const requestBody = {
        model: constants.LLM_MODEL,
        messages: messages,
        temperature: constants.LLM_TEMPERATURE,
        max_tokens: parseInt(maxTokens, 10)
    };

    logger.debug(`Sending summarization request with requestBody: ${JSON.stringify(requestBody, null, 2)}`);
    try {
        const response = await openai.completions.create(requestBody);
        logger.debug(`Received raw API response: ${JSON.stringify(response, null, 2)}`);

        if (!response.choices || response.choices.length === 0) {
            logger.error('No choices were returned in the API response.', { response });
            return new LLMResponse("", "error", 0);
        }

        const firstChoice = response.choices[0];
        const summary = extractContent(firstChoice);

        if (!summary) {
            logger.error('No valid content was found in the first choice of the API response.', { firstChoice });
            return new LLMResponse("", "error", 0);
        }

        logger.info('Summarization processed successfully.', { summary });
        return new LLMResponse(summary, firstChoice.finish_reason, response.usage.total_tokens);
    } catch (error) {
        handleError(error);
        logger.error(`An error occurred during the text summarization process: ${error.message}`, { requestBody, error });
        return new LLMResponse("", "error", 0);
    }
}


/**
 * Extracts the message content from a response choice.
 * 
 * @param {Object} choice - The choice object from the OpenAI API response.
 * @returns {string} The extracted message content if available; an empty string otherwise.
 */
function extractContent(choice) {
    if (!choice) {
        logger.debug("[openAiManagerUtils.extractContent] No choice object provided for content extraction.");
        return "";  // Return an empty string if no choice object is found.
    }

    if (choice.text && typeof choice.text === 'string') {
        logger.debug("[openAiManagerUtils.extractContent] Content extracted directly from 'text' field.");
        return choice.text;
    } else if (choice.message && typeof choice.message.content === 'string') {
        logger.debug("[openAiManagerUtils.extractContent] Content extracted from 'message.content' field.");
        return choice.message.content;
    } else {
        logger.debug("[openAiManagerUtils.extractContent] No valid content found in choice object; returning empty string.");
        return "";  // Return an empty string if no valid content structure is identified.
    }
}

/**
 * Sends a request to the OpenAI completions endpoint and validates the response.
 * 
 * @param {Object} openai - The OpenAI client instance.
 * @param {Object} requestBody - The body of the request to send.
 * @returns {Promise<Object>} The response from the OpenAI API if valid.
 * @throws {Error} If the response is invalid or an error occurs during the request.
 */
async function makeOpenAiRequest(openai, requestBody) {
    try {
        const response = await openai.completions.create(requestBody);
        if (!response || !response.choices || response.choices.length === 0 ||
            !response.choices[0].message || !response.choices[0].message.content) {
            throw new Error('No valid message content was returned in the API response.');
        }
        logger.debug("OpenAI request successful, response valid.");
        return response;
    } catch (error) {
        logger.error(`Failed to make OpenAI request: ${error.message}`, { requestBody });
        throw new Error(`OpenAI API request failed: ${error.message}`);
    }
}

/**
 * Completes a sentence if it ends abruptly due to reaching the max token limit.
 * 
 * @param {Object} openai - The OpenAI client instance.
 * @param {string} content - The content that might need completion.
 * @param {string} finishReason - The reason the initial request ended (e.g., 'length' for token limit).
 * @param {Object} constants - Configuration constants (model, max_tokens, etc.).
 * @returns {Promise<string>} The potentially completed content.
 */
async function completeSentence(openai, content, finishReason, constants) {
    if (finishReason === 'length' && !/[.?!]\s*$/.test(content)) {
        const lastSpace = content.lastIndexOf(" ");
        const promptText = lastSpace !== -1 ? content.substring(lastSpace + 1) : content;
        const continuationBody = {
            model: constants.LLM_MODEL,
            prompt: promptText,
            max_tokens: 50,  // small number to just try and finish the thought
            temperature: 0.7  // reasonable default for generating natural completions
        };

        logger.debug(`Attempting to complete sentence. Prompt: ${promptText}`);
        try {
            const continuationResponse = await openai.completions.create(continuationBody);
            if (continuationResponse && continuationResponse.choices && continuationResponse.choices.length > 0) {
                const continuationText = continuationResponse.choices[0].text;
                logger.debug(`Sentence completed: ${continuationText}`);
                content += continuationText;
            }
        } catch (error) {
            logger.error(`Error in completing sentence: ${error.message}`, { continuationBody });
        }
    } else {
        logger.debug("No sentence completion needed.");
    }
    return content;
}

module.exports = {
    extractContent,
    makeOpenAiRequest,
    summarize,
    completeSentence
};
