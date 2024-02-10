// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const { splitMessage } = require('./common');
const configurationManager = require('../config/configurationManager');


/**
 * Sends a request to a Large Language Model (LLM) endpoint with a given prompt.
 * @param {Object} message - The Discord message object to respond to.
 * @param {Array} conversationHistory - An array representing the conversation history, 
 * where each item is an object with a 'role' ('user' or 'assistant') and 'content'.
 * @param {string} prompt - The prompt to send to the LLM.
 */
async function sendLlmRequest(message, conversationHistory, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    // Construct the messages array with system, user, and assistant messages
    let messages = [];

    if (conversationHistory && conversationHistory.length > 0) {
        // Add existing conversation history
        messages.push(...conversationHistory);
    }

    // Add the new user prompt to the conversation
    messages.push({ role: "user", content: prompt });

    // Define the payload including the model and messages
    const payload = {
        model: LLM_MODEL,
        messages: messages,
    };

    try {
        logger.debug(`Sending LLM request: ${JSON.stringify({ url: LLM_ENDPOINT_URL, payload }, null, 2)}`);
        const response = await axios.post(LLM_ENDPOINT_URL, payload, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` }
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const replyContent = response.data.choices[0].text.trim();
            await message.channel.send(replyContent);
        } else {
            logger.warn('LLM request did not return expected data.');
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error.message}`, { payload, errorDetails: error.response?.data || error.message });
        throw error; // Rethrowing the error for potential higher-level handling
    }
}

/**
 * Fetches the conversation history from a channel.
 * @param {Object} channel - The Discord channel to fetch history from.
 * @returns {Promise<Array>} - A promise that resolves to an array of message objects.
 */
async function fetchConversationHistory(channel) {
    try {
        const limit = configurationManager.getConfig('historyFetchLimit') || 50;
        const messages = await channel.messages.fetch({ limit });
        return messages.map(message => ({
            content: message.content,
            username: message.author.username,
            timestamp: message.createdTimestamp,
            userId: message.author.id,
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        throw error; // Rethrowing the error for potential higher-level handling
    }
}

/**
 * Schedules a follow-up request to be sent after a random delay.
 * @param {Object} message - The Discord message object to respond to.
 */
function scheduleFollowUpRequest(message) {
    const delay = configurationManager.getConfig('FOLLOW_UP_MIN_DELAY') + Math.random() * (configurationManager.getConfig('FOLLOW_UP_MAX_DELAY') - configurationManager.getConfig('FOLLOW_UP_MIN_DELAY'));
    setTimeout(() => {
        // Assuming follow-up logic is defined elsewhere
        logger.info('Sending follow-up request.');
        // Placeholder for actual follow-up logic
    }, delay);
}

module.exports = {
    sendLlmRequest,
    fetchConversationHistory,
    scheduleFollowUpRequest,
};
