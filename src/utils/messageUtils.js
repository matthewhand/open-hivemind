// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const { splitMessage } = require('./common');
const configurationManager = require('../config/configurationManager');

/**
 * Helper function to log requests and responses for debugging.
 * Redacts sensitive information like API keys from the logs.
 */
function debugLogRequestResponse(url, requestBody, responseBody, error = null) {
    // Redact sensitive information from logs
    const redactedRequestBody = { ...requestBody, model: requestBody.model }; // Example of redaction, adjust as needed
    const logPayload = {
        request: { url, body: redactedRequestBody },
        response: responseBody ? { data: responseBody } : undefined,
        error: error ? { message: error.message, stack: error.stack } : undefined,
    };
    logger.debug("LLM API Request and Response:", logPayload);
}

/**
 * Sends a request to a Large Language Model (LLM) endpoint with a given prompt.
 * @param {Object} message - The Discord message object to respond to.
 * @param {string} prompt - The prompt to send to the LLM.
 */
async function sendLlmRequest(message, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');
    const payload = {
        prompt: prompt,
        model: LLM_MODEL,
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
