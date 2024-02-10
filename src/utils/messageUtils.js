// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const configurationManager = require('../config/configurationManager');

/**
 * Sends a request to the Large Language Model (LLM) endpoint, incorporating conversation history and the latest user prompt.
 * @param {Object} message - The Discord message object to respond to.
 * @param {Array} conversationHistory - An array of conversation history, with each item being an object containing 'role' and 'content'.
 * @param {string} prompt - The latest user prompt to send to the LLM.
 */
async function sendLlmRequest(message, conversationHistory, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    // Preparing the messages payload, including existing conversation history and the new user prompt
    const messages = conversationHistory ? [...conversationHistory, { role: "user", content: prompt }] : [{ role: "user", content: prompt }];

    try {
        logger.debug(`Sending LLM request to ${LLM_ENDPOINT_URL} with payload`, { model: LLM_MODEL, messages });

        const response = await axios.post(LLM_ENDPOINT_URL, { model: LLM_MODEL, messages }, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` },
        });

        // Handling different response structures
        if (response.data && response.data.response) {
            // Assuming response.data.response contains the direct reply
            await message.channel.send(response.data.response);
        } else {
            logger.warn('LLM request did not return the expected data structure.');
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error.message}`, {
            detail: { endpoint: LLM_ENDPOINT_URL, model: LLM_MODEL, messages, errorDetails: error.response?.data || 'No additional error info' },
        });
        throw error; // Ensuring upstream error handling can take place
    }
}

/**
 * Fetches the recent conversation history from a specified Discord channel.
 * @param {Object} channel - The Discord channel from which to fetch the history.
 * @returns {Promise<Array>} - A promise resolving to an array of message objects.
 */
async function fetchConversationHistory(channel) {
    try {
        const limit = configurationManager.getConfig('historyFetchLimit') || 50;
        const messages = await channel.messages.fetch({ limit });
        return messages.map((msg) => ({
            role: msg.author.bot ? 'assistant' : 'user', // Assuming bot messages as 'assistant' and others as 'user'
            content: msg.content,
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', { error: error.message });
        throw error; // Allowing for upstream error handling
    }
}

/**
 * Schedules a follow-up action, demonstrating placeholder functionality.
 * @param {Object} message - The Discord message object to target for follow-up.
 */
function scheduleFollowUpRequest(message) {
    const minDelay = configurationManager.getConfig('FOLLOW_UP_MIN_DELAY');
    const maxDelay = configurationManager.getConfig('FOLLOW_UP_MAX_DELAY');
    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    setTimeout(() => logger.info('Sending scheduled follow-up request.'), delay);
}

module.exports = {
    sendLlmRequest,
    fetchConversationHistory,
    scheduleFollowUpRequest,
};
