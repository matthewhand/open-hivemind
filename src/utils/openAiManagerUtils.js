const OpenAI = require("openai");
const logger = require('./logger');
const { handleError } = require('./handleError');
const constants = require('../config/constants');
const LLMResponse = require('../interfaces/LLMResponse');

/**
 * Summarizes the given text by sending a request to the OpenAI API.
 * The function constructs a specific payload to encourage the model
 * to adjust and shorten the provided text, optionally embellishing it
 * with emojis as per the user's request.
 *
 * @param {OpenAI} openai - The OpenAI API client instance.
 * @param {string} userMessage - The original message provided by the user.
 * @param {string} [systemMessageContent="Adjust text as per User requirement. Respond with only the revised message."] - The system message to guide the OpenAI model.
 * @param {number} [maxTokens=constants.LLM_RESPONSE_MAX_TOKENS] - The maximum number of tokens allowed for the OpenAI response.
 * @returns {Promise<LLMResponse>} - An LLMResponse object containing the summarized text, finish reason, and the number of tokens used.
 */
async function summarize(openai, userMessage, systemMessageContent = constants.LLM_SUMMARY_PROMPT, maxTokens = constants.LLM_RESPONSE_MAX_TOKENS) {
    logger.debug('Starting the text summarization process.');

    let messages = [
        { role: 'system', content: systemMessageContent },
        { role: 'user', content: userMessage }
    ];

    const requestBody = {
        model: constants.LLM_MODEL,
        messages: messages,
        temperature: constants.LLM_TEMPERATURE,
        max_tokens: parseInt(maxTokens, 10)
    };

    logger.debug(`Sending summarization request with body: ${JSON.stringify(requestBody, null, 3)}`);
    try {
        const response = await openai.completions.create(requestBody);
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
        handleError(error);
        logger.error(`Error in text summarization: ${error.message}`);
        return new LLMResponse("", "error", 0); // Error handling, ensuring a consistent return type
    }
}

module.exports = {
    summarize
};
