const axios = require('axios');
const logger = require('../utils/logger'); // Assuming you have a logger utility

// data object for Discord command configuration
const data = {
    name: 'memgpt',
    description: 'Interacts with the MemGPT service.'
};

// execute function to handle the command
async function execute(message, args) {
    const agentId = args[0]; // Assuming first argument is the agentId
    const messageContent = args.slice(1).join(' '); // Rest of the arguments form the message

    const requestUrl = `${process.env.MEMGPT_ENDPOINT_URL}/api/agents/message`;
    const userId = process.env.MEMGPT_USER_ID;
    const memGptApiKey = process.env.MEMGPT_API_KEY;
    const headers = {};

    if (memGptApiKey) {
        headers['Authorization'] = `Bearer ${memGptApiKey}`;
    } else {
        logger.warn('MEMGPT_API_KEY is not defined. Proceeding without Authorization header.');
    }

    try {
        const response = await axios.post(requestUrl, {
            agent_id: agentId,
            user_id: userId,
            message: messageContent
        }, { headers });

        logger.debug('Request sent to MemGPT:', { agentId, userId, message: messageContent });
        logger.debug('Response received from MemGPT:', response.data);

        // Send the response back to the Discord channel
        message.channel.send(response.data); // Modify this line based on how you want to format the response
    } catch (error) {
        logger.error('Error sending request to MemGPT:', error);
        if (error.response) {
            logger.error('Response details:', {
                data: error.response.data,
                status: error.response.status,
                headers: error.response.headers
            });
        } else if (error.request) {
            logger.error('Request details:', error.request);
        } else {
            logger.error('Error details:', error.message);
        }
        message.channel.send('Failed to send request to MemGPT. Please try again later.');
    }
}

module.exports = { data, execute };
