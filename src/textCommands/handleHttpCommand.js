// src/textCommands/handleHttpCommand.js
const axios = require('axios');
const logger = require('../utils/logger');

// Parses the .env file for HTTP actions and their corresponding URLs
const httpActions = process.env.HTTP_ACTIONS.split(',');
const httpUrls = httpActions.reduce((acc, action) => {
    acc[action] = process.env[`HTTP_${action.toUpperCase()}_URL`];
    return acc;
}, {});

async function handleHttpCommand(message, args) {
    if (!args) {
        message.reply('Please provide an action and a query.');
        return;
    }

    const [action, ...queryParts] = args.split(' ');
    const query = queryParts.join(' ');
    const url = httpUrls[action];

    if (!url) {
        logger.error(`Unknown action: ${action}`);
        message.reply(`Unknown action: ${action}`);
        return;
    }
    if (!query) {
        message.reply(`Please provide a query for the action: ${action}.`);
        return;
    }

    const fullUrl = `${url}${encodeURIComponent(query)}`;
    logger.debug(`Sending request to: ${fullUrl}`);

    try {
        const response = await axios.get(fullUrl);

        if (response.status === 200 && response.data) {
            const responseText = JSON.stringify(response.data); // Adjust this line if the response format is known and different
            message.reply(`Response from ${action}: ${responseText}`);
        } else {
            logger.error(`Error from ${action} API: Status ${response.status}`);
            message.reply(`An error occurred while processing your request to ${action}.`);
        }
    } catch (error) {
        logger.error(`Error in handleHttpCommand: ${error.message}`);
        message.reply(`An error occurred while processing your request to ${action}.`);
    }
}

module.exports = { handleHttpCommand };
