const axios = require('axios');

async function handleFlowiseRequest(message, args) {
    // Check if args is empty or not provided, and list available actions
    if (!args) {
        const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
        const availableActions = `Available Flowise actions: ${flowiseActions.join(', ')}`;
        message.reply(availableActions);
        return;
    }

    // Parsing the action and query from args
    const [action, ...queryParts] = args.split(' ');
    const query = queryParts.join(' ');

    // Check if a query is provided
    if (!query) {
        message.reply(`Please provide a query for Flowise ${action}.`);
        return;
    }

    // Check if the action is valid
    const flowiseActions = process.env.FLOWISE_ACTIONS.split(',');
    if (!flowiseActions.includes(action)) {
        message.reply(`Unknown or disabled Flowise action: ${action}`);
        return;
    }

    // Construct the Flowise API URL
    const flowiseEndpointId = process.env[`FLOWISE_${action.toUpperCase()}_ID`];
    const flowiseUrl = `${process.env.FLOWISE_API_BASE_URL}${flowiseEndpointId}`;

    try {
        // Making the request to the Flowise API
        const flowiseResponse = await axios.post(flowiseUrl, { question: query });

        if (flowiseResponse.status === 200) {
            // Extracting and sending the text response
            const flowiseText = flowiseResponse.data.text;
            message.reply(`Flowise ${action} response: ${flowiseText}`);
        } else {
            console.error(`Error from Flowise API: ${flowiseResponse.status}`);
            message.reply(`An error occurred while processing your Flowise ${action} request.`);
        }
    } catch (error) {
        // Error handling
        console.error(`Error in handleFlowiseRequest: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response)}`);
        }
        message.reply(`An error occurred while processing your Flowise ${action} request.`);
    }
}

module.exports = { handleFlowiseRequest };

