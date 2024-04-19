const OpenAI = require("openai");
const logger = require('./logger');
const { handleError } = require('./handleError');
const LLMResponse = require('../interfaces/LLMResponse');
const constants = require('../config/constants');

/**
 * Attempts to retrieve the message content from the first choice of the response.
 * @param {Object} firstChoice - The first choice object from the OpenAI API response.
 * @returns {string|null} The message content if available, null otherwise.
 */
function getMessageContent(firstChoice) {
    if (firstChoice.message && typeof firstChoice.message.content === 'string') {
        return firstChoice.message.content;
    } else if (typeof firstChoice.text === 'string') {
        return firstChoice.text;
    } else {
        return null;
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
        { role: 'user', content: "please summarise" }
    ];

    const requestBody = {
        model: constants.LLM_MODEL,
        messages: messages,
        temperature: constants.LLM_TEMPERATURE,
        max_tokens: parseInt(maxTokens, 10)
    };

    logger.debug(`Sending summarization request with body: ${JSON.stringify(requestBody, null, 2)}`);
    try {
        const response = await openai.completions.create(requestBody);
        logger.debug(`Raw API response: ${JSON.stringify(response, null, 2)}`);

        if (!response.choices || response.choices.length === 0) {
            logger.error('No choices were returned in the API response.', { requestBody });
            return new LLMResponse("", "error", 0);
        }

        const firstChoice = response.choices[0];
        const summary = getMessageContent(firstChoice);

        if (!summary) {
            logger.error('Error: Missing text in the first choice.', { firstChoice });
            return new LLMResponse("", "error", 0);
        }

        logger.info('Summarization processed successfully.');
        logger.debug(`Summarized text: ${summary}`);

        return new LLMResponse(summary, firstChoice.finish_reason, response.usage.completion_tokens);
    } catch (error) {
        handleError(error);
        logger.error(`Error in text summarization: ${error.message}`, { error, requestBody });
        return new LLMResponse("", "error", 0); // Error handling, ensuring a consistent return type
    }
}


module.exports = {
    summarize
};
