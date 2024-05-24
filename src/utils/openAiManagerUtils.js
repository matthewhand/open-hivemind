const logger = require('./logger');
const constants = require('../config/constants');

/**
 * Extracts the textual content from a choice object within the OpenAI API response. This function
 * ensures that the extracted content is a valid string and logs detailed information about the
 * extraction process.
 *
 * @param {Object} choice - The choice object from the OpenAI API response which contains the text to be extracted.
 * @returns {string} The extracted text if available; otherwise, returns an empty string.
 */
function extractContent(choice) {
    // Initial validation to ensure the choice object is provided
    if (!choice) {
        logger.debug("[extractContent] No choice object provided for content extraction.");
        return "";
    }

    // Debugging: Log the actual choice object before processing
    logger.debug(`[extractContent] Initial choice object: ${JSON.stringify(choice)}`);

    // Check for 'text' field which is directly usable
    if (choice.text && typeof choice.text === 'string') {
        logger.debug("[extractContent] Content extracted directly from 'text' field.");
        return choice.text.trim();
    }

    // Check for 'message' field with nested 'content' which is the fallback content source
    else if (choice.message && typeof choice.message.content === 'string') {
        logger.debug("[extractContent] Content extracted from 'message.content' field.");
        return choice.message.content.trim();
    }

    // If no valid content structure is identified, log the issue and return an empty string
    else {
        logger.debug("[extractContent] No valid content found in choice object; returning empty string.");
        return "";
    }
}

/**
 * Sends a request to the OpenAI API to generate text completions and handles the response.
 * This function ensures that the request body is appropriate and logs detailed information
 * about the request and response processes.
 *
 * @param {Object} openai - The OpenAI client instance used to make API calls.
 * @param {Object} requestBody - The body of the request which includes the model, prompt, and other parameters.
 * @returns {Promise<Object>} The response from the OpenAI API, structured as an object.
 * @throws {Error} If the response from the API is invalid or if an error occurs during the request.
 */
async function makeOpenAiRequest(openai, requestBody) {
    // Validate input types
    if (typeof openai !== 'object' || openai === null) {
        logger.error("[makeOpenAiRequest] Invalid OpenAI client instance passed.");
        throw new TypeError("Invalid OpenAI client instance passed.");
    }

    if (typeof requestBody !== 'object' || requestBody === null) {
        logger.error("[makeOpenAiRequest] Invalid request body passed.");
        throw new TypeError("Invalid request body passed.");
    }

    // Debugging: Log the request body
    logger.debug(`[makeOpenAiRequest] Sending request with body: ${JSON.stringify(requestBody)}`);

    try {
        const requestOptions = {
            timeout: 300 * 1000, // 300 seconds
        }

        let response = null;
        if (requestBody.prompt) {
            response = await openai.completions.create(requestBody, requestOptions);
        } else {
            response = await openai.chat.completions.create(requestBody, requestOptions);
        }

        // Validate response structure
        if (!response || !response.choices || response.choices.length === 0) {
            logger.error("[makeOpenAiRequest] No valid response or choices returned from the API.");
            throw new Error("No valid response or choices returned from the API.");
        }

        // Debugging: Log the raw API response
        logger.debug(`[makeOpenAiRequest] Received response: ${JSON.stringify(response)}`);

        return response;
    } catch (error) {
        logger.error(`[makeOpenAiRequest] Failed to make OpenAI request: ${error.message}`, error);
        throw new Error(`OpenAI API request failed: ${error.message}`);
    }
}

/**
 * Completes a sentence by generating additional content if the response is cut off or incomplete.
 * This function is designed to handle cases where the initial response from the OpenAI API does not
 * terminate with a proper ending punctuation mark, indicating that the response may be incomplete.
 *
 * @param {Object} openai - The OpenAI client instance used to make API calls.
 * @param {string} content - The initial content that might be incomplete and needs finishing.
 * @param {Object} constants - Contains configuration constants like model and token limits.
 * @returns {Promise<string>} The potentially completed content, ensuring it ends with proper punctuation.
 */
async function completeSentence(openai, content, constants) {
    if (typeof content !== 'string') {
        logger.error("[completeSentence] The content must be a string.");
        throw new TypeError("Expected content to be a string, received type " + typeof content);
    }

    // Debugging: Log the type and actual content before processing
    logger.debug(`[completeSentence] Content type: ${typeof content}, content value: ${content}`);

    // Check if the content already ends with a punctuation mark
    if (/[.?!]\s*$/.test(content)) {
        logger.debug("[completeSentence] Content already ends with a punctuation mark.");
        return content;  // Return as no completion needed
    }

    // Preparing the prompt for OpenAI to generate the rest of the content
    const promptText = content.trim() + " ";  // Ensure there's a space after the last word
    const continuationBody = {
        model: constants.LLM_MODEL,
        prompt: promptText,
        max_tokens: 50,  // Allow a small number of extra tokens to complete the sentence
        temperature: 0.5  // Using a moderate temperature for natural completions
    };

    logger.debug(`[completeSentence] Sending continuation request: ${JSON.stringify(continuationBody)}`);

    try {
        const continuationResponse = await openai.completions.create(continuationBody);
        if (!continuationResponse || !continuationResponse.choices || continuationResponse.choices.length === 0) {
            logger.error("[completeSentence] No valid choices returned from the API.");
            throw new Error("Failed to retrieve valid choices from the API.");
        }

        const continuationText = continuationResponse.choices[0].text.trim();
        if (continuationText) {
            logger.debug(`[completeSentence] Received continuation text: ${continuationText}`);
            content += continuationText;  // Append the additional text to the original content
        } else {
            logger.warn("[completeSentence] Received empty continuation text.");
        }
    } catch (error) {
        logger.error("[completeSentence] Error completing sentence:", error);
        throw error;  // Rethrow to handle the error further up the call stack
    }

    return content;
}

/**
 * Determines if the content needs to be completed based on the tokens used and the finish reason.
 * @param {boolean} maxTokensReached - Whether the maximum token count has been reached.
 * @param {string} finishReason - The reason provided by the API for the text generation stopping.
 * @param {string} content - The generated content that may need completion.
 * @returns {boolean} True if the sentence should be completed, false otherwise.
 */
function needsCompletion(maxTokensReached, finishReason, content) {
    return (maxTokensReached || finishReason === 'length') && !/[.?!]\s*$/.test(content);
}

/**
 * Selects a random emoji from a predefined list.
 * @returns {string} A random emoji.
 */
function getEmoji() {
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '😘', '😗', '😙', '😚', '😋',
        '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳',
        '🤖', '👀'
    ];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

module.exports = {
    extractContent,
    makeOpenAiRequest,
    completeSentence,
    needsCompletion,
    getEmoji
};
