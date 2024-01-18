const axios = require('axios');
const logger = require('../utils/logger');

async function handleQuivrRequest(message, args) {
    if (!args) {
        message.reply('Please provide a query for Quivr.');
        return;
    }

    const quivrUrl = `${process.env.QUIVR_URL}/chat/${process.env.QUIVR_CHAT_ID}/question?brain_id=${process.env.QUIVR_BRAIN_ID}`;
    logger.debug(`Sending request to Quivr: ${quivrUrl} with args: ${args}`);

    try {
        const quivrResponse = await axios.post(
            quivrUrl,
            { question: args },
            { headers: { 'Authorization': `Bearer ${process.env.QUIVR_API_KEY}` } }
        );

        if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
            const quivrResult = quivrResponse.data.assistant;

            // Split the message into chunks of 2000 characters
            const messageChunks = quivrResult.match(/[\s\S]{1,2000}/g) || [quivrResult];
            for (const chunk of messageChunks) {
                await message.reply(chunk);
            }
            logger.info('Quivr response sent successfully.');
        } else {
            logger.error(`Error from Quivr API: Status ${quivrResponse.status}`);
            message.reply('An error occurred while processing your Quivr request.');
        }
    } catch (error) {
        logger.error(`Error in handleQuivrRequest: ${error.message}`);
        message.reply('An error occurred while processing your Quivr request.');
    }
}

module.exports = { handleQuivrRequest };

