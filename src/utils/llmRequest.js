const axios = require('axios');
const { constants } = require('./configUtils');
const { splitMessage } = require('./common');
const logger = require('./logger');

async function sendLlmRequest(message, prompt) {
    try {
        const response = await axios.post(constants.LLM_ENDPOINT_URL, {
            prompt: prompt,
            model: constants.LLM_MODEL,
            // ...other parameters...
        });

        if (response.data) {
            const replyContent = response.data.choices[0].text.trim();
            const messagesToSend = splitMessage(replyContent, 2000);
            messagesToSend.forEach(async (msg) => await message.channel.send(msg));
        }
    } catch (error) {
        logger.error(`Error in sendLlmRequest: ${error.message}`);
    }
}

module.exports = { sendLlmRequest };
