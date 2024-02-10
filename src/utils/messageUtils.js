// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const configurationManager = require('../config/configurationManager');

/**
 * Sends a request to the Large Language Model (LLM) endpoint, incorporating conversation history and the latest user prompt.
 * @param {Object} message - The Discord message object to respond to.
 * @param {string} prompt - The latest user prompt to send to the LLM.
 */
async function sendLlmRequest(message, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    // Attempt to fetch conversation history if applicable
    let history = [];
    try {
        history = await fetchConversationHistory(message.channel);
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        // Consider whether to continue or abort if history cannot be fetched
    }

    // Append the latest message to the history
    history.push({ role: "user", content: prompt });

    try {
        logger.debug(`Sending LLM request to ${LLM_ENDPOINT_URL} with payload`, { model: LLM_MODEL, messages: history });

        const response = await axios.post(LLM_ENDPOINT_URL, { model: LLM_MODEL, messages: history }, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` },
        });

        if (response.data && response.data.response) {
            await message.channel.send(response.data.response);
        } else {
            logger.warn('LLM request did not return the expected data structure.', response.data);
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error.message}`, {
            detail: { endpoint: LLM_ENDPOINT_URL, model: LLM_MODEL, messages: history, errorDetails: error.response?.data || 'No additional error info' },
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
        return Array.from(messages.values()).map((msg) => ({
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
