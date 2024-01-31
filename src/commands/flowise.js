const { getRandomErrorMessage } = require('../config/errorMessages');
const axios = require('axios');
const logger = require('../utils/logger');

async function handleFlowiseRequest(message, action = undefined, args = undefined) {
    console.log(`[handleFlowiseRequest] Action: ${action}, Args: ${args}`);

    // If action is undefined or empty, list available actions
    if (!action || action.trim() === '') {
        const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
        message.reply(`Available Flowise actions: ${flowiseActions.join(', ')}`);
        return;
    }

    // If args is undefined or empty after the action, request a query
    if (!args || args.trim() === '') {
        message.reply(`Please provide a query for Flowise ${action}.`);
        return;
    }


    const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
    if (!flowiseActions.includes(action)) {
        message.reply(`Unknown or disabled Flowise action: ${action}`);
        return;
    }

    const flowiseEndpointId = process.env[`FLOWISE_${action.toUpperCase()}_ID`];
    const flowiseUrl = `${process.env.FLOWISE_API_BASE_URL}${flowiseEndpointId}`;

    try {
        const flowiseResponse = await axios.post(flowiseUrl, { question: args });

        if (flowiseResponse.status === 200) {
            const flowiseText = flowiseResponse.data.text;
            message.reply(`Flowise ${action} response: ${flowiseText}`);
        } else {
            console.error(`Error from Flowise API: ${flowiseResponse.status}`);
            message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        console.error(`Error in handleFlowiseRequest: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response)}`);
        }
        message.reply(getRandomErrorMessage());
    }
}

module.exports = { handleFlowiseRequest };
