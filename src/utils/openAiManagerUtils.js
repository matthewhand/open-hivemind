const logger = require('./logger');

/**
 * Extracts the message content from a response choice.
 * @param {Object} choice - The choice object from the OpenAI API response.
 * @returns {string} The extracted message content if available; otherwise, an empty string.
 */
function extractContent(choice) {
    if (!choice) {
        logger.debug("[extractContent] No choice object provided for content extraction.");
        return "";  
    }

    if (choice.text && typeof choice.text === 'string') {
        logger.debug("[extractContent] Content extracted directly from 'text' field.");
        return choice.text;
    } else if (choice.message && typeof choice.message.content === 'string') {
        logger.debug("[extractContent] Content extracted from 'message.content' field.");
        return choice.message.content;
    } else {
        logger.debug("[extractContent] No valid content found in choice object; returning empty string.");
        return "";  
    }
}

/**
 * Sends a request to the OpenAI API to generate text completions.
 * @param {Object} openai - The OpenAI client instance.
 * @param {Object} requestBody - The request body to send.
 * @returns {Promise<Object>} The response from the OpenAI API, if valid.
 */
async function makeOpenAiRequest(openai, requestBody) {
    try {
        const response = await openai.completions.create(requestBody);
        if (!response || !response.choices || response.choices.length === 0) {
            throw new Error('No valid response or choices returned from the API.');
        }
        logger.debug("[makeOpenAiRequest] OpenAI request successful, response valid.");
        return response;
    } catch (error) {
        logger.error(`[makeOpenAiRequest] Failed to make OpenAI request: ${error.message}`, { requestBody });
        throw new Error(`OpenAI API request failed: ${error.message}`);
    }
}

/**
 * Completes a sentence by generating additional content.
 * @param {Object} openai - The OpenAI client instance.
 * @param {string} content - The content that might need completion.
 * @param {Object} constants - Configuration constants (model, max_tokens, etc.).
 * @returns {Promise<string>} The completed content.
 */
async function completeSentence(openai, content, constants) {
    const promptText = content.split(/\s+/).slice(-5).join(' ');  // Use the last five words as the prompt for completion.
    const continuationBody = {
        model: constants.LLM_MODEL,
        prompt: promptText,
        max_tokens: 50,  // Limit the number of additional tokens to generate.
        temperature: 0.7  // Reasonable default for generating natural completions.
    };

    logger.debug(`[completeSentence] Attempting to complete sentence. Prompt: ${promptText}`);
    try {
        const continuationResponse = await openai.completions.create(continuationBody);
        if (continuationResponse && continuationResponse.choices && continuationResponse.choices.length > 0) {
            const continuationText = continuationResponse.choices[0].text.trim();
            logger.debug(`[completeSentence] Sentence completed: ${continuationText}`);
            content += continuationText;
        }
    } catch (error) {
        logger.error(`[completeSentence] Error in completing sentence: ${error.message}`, { continuationBody });
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
