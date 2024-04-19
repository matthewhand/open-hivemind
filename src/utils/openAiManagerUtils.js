const OpenAI = require("openai");
const logger = require('./logger');
const { handleError } = require('./handleError');
const LLMResponse = require('../interfaces/LLMResponse');
const constants = require('../config/constants');

/**
 * Extracts the message content based on the response structure which varies between services.
 * This function ensures to check the structure and data type before returning the content.
 * It handles both possible structures of the response: with 'message.content' or 'text'.
 *
 * @param {Object} choice - The first choice object from the OpenAI API response.
 * @returns {string} The extracted message content if available; an empty string otherwise.
 */
function extractContent(choice) {
    if (choice.message && typeof choice.message.content === 'string') {
        return choice.message.content;
    } else if (typeof choice.text === 'string') {
        return choice.text;
    } else {
        return "";  // Return an empty string if no valid content is found.
    }
}

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
        { role: 'user', content: "..." },
        { role: 'assistant', content: userMessage },
        { role: 'user', content: "that cut off, please repeat only shorter." }
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


module.exports = {
    summarize
};
