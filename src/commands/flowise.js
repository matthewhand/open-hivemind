const axios = require('axios');
const logger = require('../utils/logger');
const { getRandomErrorMessage } = require('../config/errorMessages');

const data = {
    name: 'flowise',
    description: 'Sends a query to the Flowise API. Usage: !flowise:[action] [query]'
};

async function execute(message, action='', args) {
    // Check if the action is defined and valid
    const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
    if (!action || !flowiseActions.includes(action)) {
        message.reply(`Please specify a valid action. Available Flowise actions: ${flowiseActions.join(', ')}`);
        return;
    }

    // Check if args are provided
    if (!args) {
        message.reply(`Please provide a query for Flowise action "${action}".`);
        return;
    }

    // Construct the endpoint URL for the specified action
    const flowiseEndpointId = process.env[`FLOWISE_${action.toUpperCase()}_ID`];
    const flowiseUrl = `${process.env.FLOWISE_API_BASE_URL}${flowiseEndpointId}`;

    logger.debug(`Sending request to Flowise: ${flowiseUrl} with action: ${action} and query: ${args}`);

    try {
        const response = await axios.post(flowiseUrl, { question: args });

        if (response.status === 200) {
            const flowiseText = response.data.text;
            message.reply(`Flowise "${action}" response: ${flowiseText}`);
        } else {
            logger.error(`Error from Flowise API: ${response.status}`);
            message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        logger.error(`Error in Flowise request: ${error.message}`);
        message.reply(getRandomErrorMessage());
    }
}

module.exports = { data, execute };
