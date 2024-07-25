const axios = require('axios');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

/**
 * Command to interact with the MemGPT service.
 * Usage: !memgpt <action> <message>
 */
class MemGPTCommand extends ICommand {
    constructor() {
        super();
        this.name = 'memgpt';
        this.description = 'Interacts with the MemGPT service to send and receive messages.';
    }

    /**
     * Executes the MemGPT command using the provided message context and arguments.
     * @param {Object} message - The Discord message object that triggered the command.
     * @param {string[]} args - The arguments provided with the command.
     * @param {string} action - Specific action to be taken (usually part of args in practical usage).
     * @returns {Promise<CommandResponse>} - The result of the command execution.
     */
    async execute(args) {
        // const message = args.message;
        const action = args.action; // Assuming 'action' is separately parsed if needed
        const messageContent = args.join(' '); // Joining all arguments to form the message content

        try {
            const requestUrl = process.env.MEMGPT_ENDPOINT_URL + '/api/agents/message';
            const userId = process.env.MEMGPT_USER_ID;
            const memGptApiKey = process.env.MEMGPT_API_KEY;
            const headers = memGptApiKey ? { 'Authorization': 'Bearer ' + memGptApiKey } : {};

            const response = await axios.post(requestUrl, {
                agent_id: action,
                user_id: userId,
                message: messageContent
            }, { headers });

            logger.debug('MemGPTCommand: Request sent to MemGPT for agent ' + action + ' with message: ' + messageContent);
            logger.debug('MemGPTCommand: Response received from MemGPT with data: ' + response.data);

            return { success: true, message: response.data };
        } catch (error) {
            logger.error('MemGPTCommand execute error: ' + error);
            return { success: false, message: getRandomErrorMessage(), error: error.toString() };
        }
    }
}

module.exports = MemGPTCommand;
