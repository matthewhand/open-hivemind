const axios = require('axios');
const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

/**
 * Defines the QuivrCommand class that sends queries to the Quivr API.
 * This class extends the Command class and manages the execution of the 'quivr' command.
 */
class QuivrCommand extends Command {
    /**
     * Constructs an instance of the QuivrCommand.
     */
    constructor() {
        super('quivr', 'Sends a query to the Quivr API. Usage: !quivr:[chatCategory] [query]');
    }

    /**
     * Executes the command with the provided message and arguments.
     * It sends a query to the Quivr API and replies with the result.
     * 
     * @param {IMessage} message - The message object implementing the IMessage interface.
     * @param {string} args - A string containing all arguments passed to the command.
     * @param {string|null} action - Not used in this command.
     * @returns {Promise<void>}
     */
    async execute(message, args=null, action=null) {
        if (!args) {
            logger.warn('No query provided for Quivr.');
            message.reply('Please provide a query for Quivr.');
            return;
        }

        let [chatCategory, ...queryParts] = args.split(' ');
        const query = queryParts.join(' ');

        if (!chatCategory) {
            const quivrChats = process.env.QUIVR_CHATS.split(',');
            message.reply(`Available Quivr chats: ${quivrChats.join(', ')}`);
            return;
        }

        if (!query) {
            message.reply(`Please provide a query for Quivr chat ${chatCategory}.`);
            return;
        }

        const quivrChatId = process.env[`QUIVR_${chatCategory.toUpperCase()}_CHAT`];
        const quivrBrainId = process.env[`QUIVR_${chatCategory.toUpperCase()}_BRAIN`];
        const quivrUrl = `${process.env.QUIVR_BASE_URL}${quivrChatId}/question?brain_id=${quivrBrainId}`;

        logger.debug(`Sending request to Quivr: ${quivrUrl} with query: ${query}`);

        try {
            const quivrResponse = await axios.post(
                quivrUrl,
                { question: query },
                { headers: { 'Authorization': `Bearer ${process.env.QUIVR_API_KEY}` } }
            );

            if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
                const quivrResult = quivrResponse.data.assistant;
                const messageChunks = quivrResult.match(/[\s\S]{1,2000}/g) || [quivrResult];
                for (const chunk of messageChunks) {
                    await message.reply(chunk);
                }
            } else {
                logger.error(`Error from Quivr API: Status ${quivrResponse.status}`);
                message.reply(getRandomErrorMessage());
            }
        } catch (error) {
            logger.error(`Error in Quivr request: ${error.message}`);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new QuivrCommand();
