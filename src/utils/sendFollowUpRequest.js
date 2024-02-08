const axios = require('axios');
const { config, aliases } = require('../config');
const { constants } = require('../utils/configUtils');
const logger = require('./logger');
const { getRandomDelay } = require('./common');

async function sendFollowUpRequest(message, aliasCommand) {
    try {
        // Construct a reflective prompt for the LLM
        const reflectivePrompt = `Given the conversation, how might the command !${aliasCommand} provide further insights?`;

        // Make a request to the LLM endpoint
        const response = await axios.post(config.LLM_ENDPOINT_URL, {
            model: constants.LLM_MODEL,
            prompt: reflectivePrompt,
            max_tokens: 200 // Adjust as needed
        }, {
            headers: { 'Authorization': `Bearer ${config.API_KEY}` }
        });

        // Process the LLM response and suggest the command to the user
        const suggestion = response.data.choices[0].text.trim();
        await message.channel.send(`🤖 LLM Suggestion: ${suggestion}`);
    } catch (error) {
        logger.error(`Error in sendFollowUpRequest: ${error.message}`);
        await message.channel.send('An error occurred while processing a follow-up suggestion.');
    }
}

function scheduleFollowUpRequest(message) {
    const randomAlias = Object.keys(aliases)[Math.floor(Math.random() * Object.keys(aliases).length)];
    const delay = getRandomDelay(2 * 60 * 1000, 10 * 60 * 1000); // Random delay between 2 and 10 minutes
    setTimeout(() => sendFollowUpRequest(message, randomAlias), delay);
}

module.exports = { scheduleFollowUpRequest };
