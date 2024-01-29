const axios = require('axios');
const logger = require('../utils/logger');
const { getRandomErrorMessage } = require('./errorMessages');

async function handleQuivrRequest(message, args, actionFromAlias = '') {
    let chatCategory, query;

    if (actionFromAlias) {
        // Split the actionFromAlias string at the first colon
        const colonIndex = actionFromAlias.indexOf(':');
        if (colonIndex !== -1) {
            chatCategory = actionFromAlias.substring(0, colonIndex).trim();
            query = actionFromAlias.substring(colonIndex + 1).trim();
        } else {
            chatCategory = actionFromAlias.trim();
            query = '';
        }
    } else {
        // Fallback for args-based parsing
        if (!args || args.trim() === '') {
            const quivrChats = process.env.QUIVR_CHATS.split(',');
            message.reply(`Available Quivr chats: ${quivrChats.join(', ')}`);
            return;
        }
        [chatCategory, ...queryParts] = args.split(' ');
        query = queryParts.join(' ');
    }

    console.log(`[handleQuivrRequest] Chat Category: ${chatCategory}, Query: ${query}`);

    if (!chatCategory || chatCategory.trim() === '') {
        message.reply('Please specify a Quivr chat category.');
        return;
    }

    const quivrChats = process.env.QUIVR_CHATS.split(',');
    if (!quivrChats.includes(chatCategory)) {
        message.reply(`Unknown or disabled Quivr chat: ${chatCategory}`);
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

        logger.debug(`Quivr API response: ${JSON.stringify(quivrResponse.data)}`);

        if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
            const quivrResult = quivrResponse.data.assistant;
            const messageChunks = quivrResult.match(/[\s\S]{1,2000}/g) || [quivrResult];
            for (const chunk of messageChunks) {
                await message.reply(chunk);
            }
            logger.info('Quivr response sent successfully.');
        } else {
            logger.error(`Error from Quivr API: Status ${quivrResponse.status}`);
            message.reply(getRandomErrorMessage());
        }
    } catch (error) {
        logger.error(`Error in handleQuivrRequest: ${error.message}`);
        if (error.response) {
            logger.error(`Response: ${JSON.stringify(error.response)}`);
        }
        message.reply(getRandomErrorMessage());
    }
}

module.exports = { handleQuivrRequest };
