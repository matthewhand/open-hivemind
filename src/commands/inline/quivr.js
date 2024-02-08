// commands/quivr.js
const axios = require('axios');
const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class QuivrCommand extends Command {
    constructor() {
        super('quivr', 'Sends a query to the Quivr API. Usage: !quivr:[chatCategory] [query]');
    }

    async execute(message, args=null, action=null) {
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
