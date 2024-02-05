const axios = require('axios');
const logger = require('../utils/logger');
const Command = require('../utils/Command');
const { getRandomErrorMessage } = require('../config/errorMessages');

class MemGPTCommand extends Command {
    constructor() {
        super('memgpt', 'Interacts with the MemGPT service.');
    }

    async execute(message, args) {
        try {
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
            logger.error('Error in MemGPTCommand execute:', error);
            message.channel.send(getRandomErrorMessage());
        }
    }
}

module.exports = new MemGPTCommand();
