// src/utils/messageUtils.js
const axios = require('axios');
const logger = require('./logger');
const { splitMessage } = require('./common');
const loadServerPolicy = require('./loadServerPolicy');
const configurationManager = require('../config/configurationManager');

/**
 * Sends a request to a Large Language Model (LLM) endpoint with a given prompt.
 * @param {Object} message - The Discord message object to respond to.
 * @param {string} prompt - The prompt to send to the LLM.
 */
async function sendLlmRequest(message, prompt) {
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            prompt: prompt,
            model: LLM_MODEL,
        }, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` }
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const replyContent = response.data.choices[0].text.trim();
            const messagesToSend = splitMessage(replyContent, 2000);
            messagesToSend.forEach(async msg => await message.channel.send(msg));
        } else {
            logger.warn('LLM request did not return expected data.');
        }
    } catch (error) {
        logger.error(`Error sending LLM request: ${error}`, { prompt: prompt.substring(0, 50) });
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
 * Determines if a user should be banned based on chat history and server policy.
 * @param {Array} chatHistory - The chat history as an array of messages.
 * @param {string} userId - The ID of the user in question.
 * @returns {Promise<string>} - A promise that resolves to the decision on banning the user.
 */
async function shouldUserBeBanned(chatHistory, userId) {
    const serverPolicy = loadServerPolicy();
    const prompt = `Given the chat history and server policy, should user ${userId} be banned?`;

    try {
        const response = await axios.post(configurationManager.getConfig('LLM_ENDPOINT_URL'), {
            prompt: `${chatHistory.join('\n')}\n\nServer Policy:\n${serverPolicy}\n\n${prompt}`,
            model: configurationManager.getConfig('LLM_MODEL'),
        }, {
            headers: { 'Authorization': `Bearer ${configurationManager.getConfig('LLM_API_KEY')}` }
        });

        return response.data && response.data.choices && response.data.choices.length > 0
            ? response.data.choices[0].text.trim()
            : 'Unable to determine.';
    } catch (error) {
        logger.error(`Error determining ban: ${error}`);
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
    shouldUserBeBanned,
    scheduleFollowUpRequest,
};
