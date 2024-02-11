// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const configurationManager = require('../config/configurationManager');

/**
 * Sends a request to the LLM endpoint with conversation history and the latest user message.
 * @param {Object} message - Discord message object to respond to.
 */
async function sendLlmRequest(message) {
    const endpointUrl = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const model = configurationManager.getConfig('LLM_MODEL');
    const apiKey = configurationManager.getConfig('LLM_API_KEY');

    // Fetch conversation history here if necessary or pass it from outside if already available
    const history = await fetchConversationHistory(message.channel);
    const newPrompt = message.content; // Assuming the new message is the prompt

    // Build the request payload.
    const payload = {
        model,
        prompt: [
            ...history.map(msg => ({ role: msg.role, content: msg.content })),
            { role: "user", content: newPrompt }
        ],
    };

    try {
        logger.debug(`Sending LLM request to ${endpointUrl} with payload: ${JSON.stringify(payload)}`);
        const response = await axios.post(endpointUrl, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Process the response from LLM.
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
 * Fetches conversation history from a Discord channel.
 * @param {Object} channel - Discord channel to fetch messages from.
 * @returns {Promise<Array>} - A promise that resolves to an array of messages.
 */
async function fetchConversationHistory(channel) {
    try {
        const limit = configurationManager.getConfig('HISTORY_FETCH_LIMIT') || 50;
        // Fetch messages returns a Collection, not an array
        const fetchedMessages = await channel.messages.fetch({ limit });
        // Convert the Collection to an Array
        const messagesArray = Array.from(fetchedMessages.values());
        return messagesArray.map(msg => ({
            role: msg.author.bot ? 'assistant' : 'user',
            content: msg.content,
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        throw error;
    }
}

/**
 * Placeholder for scheduling a follow-up action.
 * @param {Object} message - Discord message object to target for the follow-up.
 */
function scheduleFollowUpRequest(message) {
    // Implementation for scheduling follow-ups if needed.
    logger.info(`Scheduled follow-up for message ${message.id}`);
}

module.exports = {
    sendLlmRequest,
    fetchConversationHistory,
    scheduleFollowUpRequest,
};
