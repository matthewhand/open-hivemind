const axios = require('axios');
const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

/**
 * QuivrCommand class for sending queries to the Quivr API.
 * This class extends the Command class and manages the execution of the 'quivr' command,
 * sending a query to the Quivr API and using a generic response handler to reply.
 *
 * @extends Command
 */
class QuivrCommand extends Command {
    /**
     * Constructs an instance of the QuivrCommand.
     * @param {Function} responseHandler - A function to call for sending replies. It should accept response text and a channel ID as arguments.
     * @param {string} channelId - The ID of the channel where responses should be sent.
     */
    constructor(responseHandler, channelId) {
        super('quivr', 'Sends a query to the Quivr API. Usage: !quivr [chatCategory] [query]');
        this.responseHandler = responseHandler;
        this.channelId = channelId;
    }

    /**
     * Executes the 'quivr' command with the provided arguments.
     * It sends a query to the Quivr API and processes the result using the provided responseHandler.
     *
     * @param {IMessage} message - The message object implementing the IMessage interface from which the command was invoked.
     * @param {string} args - A string containing all arguments passed to the command. Expected format: "[chatCategory] [query]"
     * @param {string|null} action - An optional action parameter, not used in this command.
     * @returns {Promise<void>} A promise that resolves when the command execution has completed.
     */
    async execute(message, args, action=null) {
        if (!args) {
            logger.warn('No query provided for Quivr.');
            this.responseHandler('Please provide a query for Quivr.', this.channelId);
            return;
        }

        const parts = args.split(' ');
        const chatCategory = parts.shift();  // Extracts and removes the chat category from the args
        const query = parts.join(' ');  // The rest is considered the query

        if (!chatCategory) {
            this.responseHandler(`Available Quivr chats: ${process.env.QUIVR_CHATS.split(',').join(', ')}`, this.channelId);
            return;
        }

        if (!query) {
            this.responseHandler(`Please provide a query for Quivr chat ${chatCategory}.`, this.channelId);
            return;
        }

        const quivrChatId = process.env[`QUIVR_${chatCategory.toUpperCase()}_CHAT`];
        const quivrBrainId = process.env[`QUIVR_${chatCategory.toUpperCase()}_BRAIN`];
        const quivrUrl = `${process.env.QUIVR_BASE_URL}${quivrChatId}/question?brain_id=${quivrBrainId}`;

        logger.debug(`Sending request to Quivr at ${quivrUrl} with query: "${query}"`);

        try {
            const quivrResponse = await axios.post(
                quivrUrl,
                { question: query },
                { headers: { 'Authorization': `Bearer ${process.env.QUIVR_API_KEY}` } }
            );

            if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
                this.responseHandler(quivrResponse.data.assistant, this.channelId);
            } else {
                this.responseHandler(getRandomErrorMessage(), this.channelId);
            }
        } catch (error) {
            logger.error(`Error in Quivr request: ${error.toString()}`, { error });
            this.responseHandler(getRandomErrorMessage(), this.channelId);
        }
    }
}

module.exports = QuivrCommand;  // Export the class, not an instance
