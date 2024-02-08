// src/utils/messageUtils.js
const axios = require('axios');
const { constants } = require('../config/constants');
const logger = require('./logger');
const { splitMessage } = require('./common');

async function sendLlmRequest(message, prompt) {
    try {
        const response = await axios.post(constants.LLM_ENDPOINT_URL, {
            prompt: prompt,
            model: constants.LLM_MODEL,
            // Include other parameters as necessary
        });

        if (response.data) {
            const replyContent = response.data.choices[0].text.trim();
            const messagesToSend = splitMessage(replyContent, 2000);
            for (const msg of messagesToSend) {
                await message.channel.send(msg);
            }
        }
    } catch (error) {
        logger.error(`Error in sendLlmRequest: ${error.message}`, error);
        // Consider providing user feedback here if necessary
    }
}

module.exports = { sendLlmRequest };
