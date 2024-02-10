// src/utils/moderationUtils.js
const axios = require('axios');
const loadServerPolicy = require('./loadServerPolicy');
const configurationManager = require('../config/configurationManager');
const logger = require('./logger');

/**
 * Determines if a user should be banned based on chat history and server policy.
 * @param {Array} chatHistory - The chat history as an array of messages.
 * @param {string} userId - The ID of the user in question.
 * @returns {Promise<string>} - A promise that resolves to the decision on banning the user.
 */
async function shouldUserBeBanned(chatHistory, userId) {
    const serverPolicy = loadServerPolicy();
    const prompt = `Given the chat history and server policy, should user ${userId} be banned?`;
    const LLM_ENDPOINT_URL = configurationManager.getConfig('LLM_ENDPOINT_URL');
    const LLM_MODEL = configurationManager.getConfig('LLM_MODEL');
    const LLM_API_KEY = configurationManager.getConfig('LLM_API_KEY');

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, {
            prompt: `${chatHistory.join('\n')}\n\nServer Policy:\n${serverPolicy}\n\n${prompt}`,
            model: LLM_MODEL,
        }, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` },
        });

        logger.debug(`Moderation decision request sent for user ${userId}`, { userId, prompt });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].text.trim();
        } else {
            logger.warn('Moderation decision request did not return expected data.');
            return 'Unable to determine.';
        }
    } catch (error) {
        logger.error(`Error determining ban for user ${userId}: ${error}`);
        throw new Error('Failed to determine ban decision.');
    }
}

module.exports = {
    shouldUserBeBanned,
};
