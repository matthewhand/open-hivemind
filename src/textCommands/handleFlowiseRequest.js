const axios = require('axios');

const errorMessages = [
    "Oops, my circuits got scrambled! 🤖",
    "Whoa, I slipped on a digital banana peel! 🍌",
    "Ah, I just had a byte burp! 🤖💨",
    "Looks like I bungled the bits! 💾",
    "Yikes, my code got a hiccup. 🤖🤧",
];

function getRandomErrorMessage() {
    const randomIndex = Math.floor(Math.random() * errorMessages.length);
    return errorMessages[randomIndex];
}

async function handleFlowiseRequest(message, args) {
    // If args is undefined or empty, list available actions
    if (!args || args.trim() === '') {
        const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
        message.reply(`Available Flowise actions: ${flowiseActions.join(', ')}`);
        return;
    }

    const [action, ...queryParts] = args.trim().split(' ');
    const query = queryParts.join(' ');

    if (!query) {
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
        const flowiseResponse = await axios.post(flowiseUrl, { question: query });

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
