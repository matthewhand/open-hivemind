const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const { splitMessage } = require('../../utils/common');
const fetchConversationHistory = require('../../utils/fetchConversationHistory');
const oaiApi = require('../../services/oaiApi');
const constants = require('../../config/constants'); // Import constants

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    async execute(message, args, action=null) {
        try {
            logger.debug(`[oai] Received args: ${args}`);

            if (!args || args.trim() === '') {
                logger.warn('[oai] No arguments provided to oai command.');
                return await message.reply('Error: No arguments provided.');
            }

            const argsArray = args.trim().split(/\s+/);
            const userMessage = argsArray.slice(1).join(' ');

            logger.debug(`[oai] Action: ${action}, User Message: ${userMessage}`);

            const historyMessages = await fetchConversationHistory(message.channel);
            if (!historyMessages || historyMessages.length === 0) {
                logger.warn('[oai] No history messages found.');
                return await message.reply('Error: Unable to fetch conversation history.');
            }

            const requestBody = oaiApi.buildRequestBody(historyMessages, userMessage, message.author.id, action);
            logger.debug(`[oai] Request body: ${JSON.stringify(requestBody)}`);

            const responseData = await oaiApi.sendRequest(requestBody);
            logger.debug(`[oai] Response Data: ${JSON.stringify(responseData)}`);

            const replyContent = this.processResponse(responseData);
            logger.debug(`[oai] Reply Content: ${replyContent}`);

            if (replyContent) {
                const messagesToSend = splitMessage(replyContent, 2000);
                for (const msg of messagesToSend) {
                    await message.channel.send(msg);
                }
            } else {
                logger.warn('[oai] No reply content received');
                await message.reply('No response received from OpenAI.');
            }
        } catch (error) {
            logger.error(`[oai] Error in execute: ${error.message}`, error);
            await message.reply(getRandomErrorMessage());
        }
    }
    
    processResponse(data) {
        if (!data) {
            logger.warn('[oai] Received null or undefined data from the server.');
            return 'No response from the server.';
        }
    
        if (!data.choices || data.choices.length === 0) {
            logger.warn('[oai] Received empty choices array from the server.');
            return 'No response from the server.';
        }
    
        const firstChoice = data.choices[0];
        if (!firstChoice || !firstChoice.message || !firstChoice.message.content) {
            logger.warn('[oai] Missing content in the first choice of the response.');
            return 'No response from the server.';
        }
    
        let content = firstChoice.message.content.trim();
        const pattern = /^<@\w+>: /;
    
        if (pattern.test(content)) {
            content = content.replace(pattern, '');
        }
    
        if (content === '') {
            logger.warn('[oai] Response content is empty after processing.');
            return 'No meaningful response from the server.';
        }
    
        return content;
    }
    
}

module.exports = new OaiCommand();
