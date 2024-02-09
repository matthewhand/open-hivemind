const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const { splitMessage } = require('../../utils/common');
const fetchConversationHistory = require('../../utils/fetchConversationHistory');
const oaiApi = require('../../managers/oaiApi');
const constants = require('../../config/constants'); // Import constants

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    async execute(message, args, action=n) {
        try {
            if (!args || args.trim() === '') {
                logger.warn('[oai] No arguments provided to oai command.');
                return await message.reply('Error: No arguments provided.');
            }

            const historyMessages = await fetchConversationHistory(message.channel);
            if (!historyMessages || historyMessages.length === 0) {
                logger.warn('[oai] No history messages found.');
                return await message.reply('Error: Unable to fetch conversation history.');
            }

            const model = action || constants.LLM_MODEL;
            const requestBody = oaiApi.buildRequestBody(historyMessages, args, message.author.id, model);

            const responseData = await oaiApi.sendRequest(requestBody);

            const replyContent = this.processResponse(responseData);
            if (replyContent) {
                const messagesToSend = splitMessage(replyContent, 2000);
                for (const msg of messagesToSend) {
                    await message.channel.send(msg);
                }
            } else {
                await message.reply('No response received from OpenAI.');
            }
        } catch (error) {
            logger.error(`[oai] Error in execute: ${error.message}`, error);
            await message.reply(getRandomErrorMessage());
        }
    }
    
    processResponse(data) {
        if (!data || !data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
            logger.warn('[oai] Inadequate response data from the server.');
            return 'No meaningful response from the server.';
        }

        let content = data.choices[0].message.content.trim();
        if (/^<@\w+>: /.test(content)) {
            content = content.replace(/^<@\w+>: /, '');
        }

        if (content === '') {
            logger.warn('[oai] Response content is empty after processing.');
            return 'No meaningful response from the server.';
        }

        return content;
    }
}

module.exports = new OaiCommand();
