// src/textCommands/handleHttpCommand.js
const axios = require('axios');
const logger = require('../utils/logger');

// Safely parse HTTP_ACTIONS, defaulting to an empty array if it's not set
const httpActions = process.env.HTTP_ACTIONS ? process.env.HTTP_ACTIONS.split(',') : [];
const httpUrls = httpActions.reduce((acc, action) => {
    const url = process.env[`HTTP_${action.toUpperCase()}_URL`];
    if (url) {
        acc[action] = url;
    }
    return acc;
}, {});

async function handleHttpCommand(message, args) {
    // Do not respond to !http commands if HTTP_ACTIONS is not defined
    if (httpActions.length === 0) {
        return;
    }

    if (!args) {
        if (httpActions.length > 0) {
            const availableActions = httpActions.join(', ');
            message.reply(`Available actions: ${availableActions}`);
        } else {
            message.reply('No available HTTP actions.');
        }
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
            const responseText = JSON.stringify(response.data); // Adjust if the response format is different
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
