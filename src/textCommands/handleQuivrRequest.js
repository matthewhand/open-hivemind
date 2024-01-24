const axios = require('axios');
const logger = require('../utils/logger');
const getRandomErrorMessage = require('./errorMessages');

async function handleQuivrRequest(message, args) {
    if (!args || args.trim() === '') {
        const quivrActions = process.env.QUIVR_ACTIONS.split(',');
        message.reply(`Available Quivr actions: ${quivrActions.join(', ')}`);
        return;
    }

    const [action, ...queryParts] = args.trim().split(' ');
    const query = queryParts.join(' ');

    if (!query) {
        message.reply(`Please provide a query for Quivr ${action}.`);
        return;
    }

    const quivrActions = process.env.QUIVR_ACTIONS.split(',');
    if (!quivrActions.includes(action)) {
        message.reply(`Unknown or disabled Quivr action: ${action}`);
        return;
    }

    const quivrEndpointId = process.env[`QUIVR_${action.toUpperCase()}_ID`];
    const quivrUrl = `${process.env.QUIVR_BASE_URL}${quivrEndpointId}/question?brain_id=${process.env.QUIVR_BRAIN_ID}`;

    logger.debug(`Sending request to Quivr: ${quivrUrl} with args: ${args}`);

    try {
        const quivrResponse = await axios.post(
            quivrUrl,
            { question: args },
            { headers: { 'Authorization': `Bearer ${process.env.QUIVR_API_KEY}` } }
        );

        if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
            const quivrResult = quivrResponse.data.assistant;
            const messageChunks = quivrResult.match(/[\s\S]{1,2000}/g) || [quivrResult];
            for (const chunk of messageChunks) {
                await message.reply(chunk);
            }
            logger.info('Quivr response sent successfully.');
        } else {
            logger.error(`Error from Quivr API: Status ${quivrResponse.status}`);
            message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        logger.error(`Error in handleQuivrRequest: ${error.message}`);
        if (error.response) {
            logger.error(`Response: ${JSON.stringify(error.response)}`);
        }
        message.reply(getRandomErrorMessage());
    }
}

module.exports = { handleQuivrRequest };
