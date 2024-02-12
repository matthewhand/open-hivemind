// src/utils/messageUtils.js
const axios = require('axios');
const { encode } = require('gpt-tokenizer');
const logger = require('./logger');
const configurationManager = require('../config/configurationManager');

/**
 * Sends a request to the LLM with the conversation history and new prompt.
 * @param {Object} message - The new message object from Discord.
 */
async function sendLlmRequest(message) {
    logger.debug('Sending LLM request started');
    const endpointUrl = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const model = configurationManager.getConfig('LLM_MODEL');
    const apiKey = configurationManager.getConfig('LLM_API_KEY');

    // Debug log for the configuration used in the request
    logger.debug(`LLM request configs: Endpoint URL - ${endpointUrl}, Model - ${model}, API Key - ${apiKey}`);

    // Fetch and trim the conversation history
    const trimmedHistory = await fetchAndTrimConversationHistory(message.channel, message.content);
    logger.debug(`Trimmed history: ${JSON.stringify(trimmedHistory)}`);

    // Prepare the payload for the LLM request
    const payload = {
        model,
        prompt: [
            ...trimmedHistory.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: message.content } // Include the new user message
        ],
    };

    logger.debug(`Payload for LLM request: ${JSON.stringify(payload)}`);

    try {
        const response = await axios.post(endpointUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        logger.debug(`LLM response data: ${JSON.stringify(response.data)}`);

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            await message.channel.send(response.data.choices[0].message.content);
        } else {
            logger.warn('LLM request did not return the expected data structure.', response.data);
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error}`, error);
    }
}

/**
 * Fetches and trims the conversation history to fit within the LLM context window based on token count.
 * @param {Object} channel - The Discord channel from which to fetch the history.
 * @param {string} newPrompt - The new user message to include in the token count.
 * @returns {Array} The trimmed conversation history suitable for the LLM prompt.
 */
async function fetchAndTrimConversationHistory(channel, newPrompt) {
    logger.debug('Fetching and trimming conversation history started');

    // Configuration for fetching messages
    const maxMessagesToFetch = parseInt(configurationManager.getConfig('HISTORY_FETCH_LIMIT') || 50);
    const maxContentLength = parseInt(configurationManager.getConfig('MAX_CONTENT_LENGTH')) || 2048;
    const responseAllocation = parseInt(configurationManager.getConfig('RESPONSE_ALLOCATION')) || 512;
    const maxTokensForHistory = maxContentLength - responseAllocation;

    // Debug log for the fetch configuration
    logger.debug(`Fetch configs: Max messages to fetch - ${maxMessagesToFetch}, Max content length - ${maxContentLength}, Response allocation - ${responseAllocation}, Max tokens for history - ${maxTokensForHistory}`);

    try {
        // Fetch messages from the channel
        const fetchedMessages = await channel.messages.fetch({ limit: maxMessagesToFetch });
        let messagesArray = Array.from(fetchedMessages.values());

        logger.debug(`Fetched ${messagesArray.length} messages from Discord channel`);

        // Prepare the history for trimming
        let history = messagesArray.map(msg => ({
            role: msg.author.bot ? 'assistant' : 'user',
            content: msg.content,
        }));

        const systemPrompt = configurationManager.getConfig('SYSTEM_PROMPT') || 'You are a helpful assistant.';
        let totalTokens = encode(systemPrompt).length + encode(newPrompt).length;

        // Trim the history based on token count
        const trimmedHistory = [];
        for (const message of history.reverse()) {
            const tokens = encode(message.content);
            if (totalTokens + tokens.length > maxTokensForHistory) break;
            trimmedHistory.unshift(message); // Maintain chronological order
            totalTokens += tokens.length;
        }

        logger.debug(`Trimmed history based on token count: ${trimmedHistory.length} messages retained`);

        return trimmedHistory;
    } catch (error) {
        logger.error(`Error fetching and trimming conversation history: ${error}`, error);
        return [];
    }
}

function scheduleFollowUpRequest(message) {
    logger.info(`Scheduled follow-up for message ${message.id}`);
}

module.exports = {
    sendLlmRequest,
    scheduleFollowUpRequest,
};
