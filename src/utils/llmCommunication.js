const axios = require('axios');
const logger = require('./logger'); // Assumed existing logger utility
const serverPolicyReader = require('./serverPolicyReader'); // Utility to read server policy

const LLM_ENDPOINT_URL = process.env.LLM_ENDPOINT_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;

/**
 * Sends a request to the LLM endpoint to evaluate if a user should be banned.
 * @param {string} chatHistory - Recent chat history for context.
 * @param {string} userId - ID of the user in question.
 * @returns {Promise<string>} - The LLM's decision on whether to ban the user.
 */
async function shouldUserBeBanned(chatHistory, userId) {
    const serverPolicy = await serverPolicyReader.readServerPolicy();
    const prompt = process.env.BAN_DECISION_PROMPT || `Should user ${userId} be banned based on server policy?`;

    const requestBody = {
        model: "text-davinci-003", // Replace with your model of choice
        prompt: `${chatHistory}\n\nServer Policy:\n${serverPolicy}\n\n${prompt}`,
        max_tokens: 1024, // Adjust as needed
    };

    try {
        const response = await axios.post(LLM_ENDPOINT_URL, requestBody, {
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}` }
        });

        if (response.status === 200 && response.data) {
            return response.data.choices[0].text.trim();
        } else {
            logger.error(`LLM request failed: Status ${response.status}`);
            return 'Error: Unable to process decision';
        }
    } catch (error) {
        logger.error(`Error in LLM communication: ${error.message}`);
        return 'Error: Communication failure';
    }
}

module.exports = { shouldUserBeBanned };
