const Command = require('../utils/Command');
const logger = require('../utils/logger');
const { getRandomErrorMessage } = require('../config/errorMessages');
const { splitMessage } = require('../utils/common');
const fetchConversationHistory = require('../utils/fetchConversationHistory');
const oaiApi = require('../services/oaiApi');

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    async execute(message, args) {
        try {
            const action = args.split(' ')[0] || 'gpt-3.5-turbo';
            const userMessage = args.split(' ').slice(1).join(' ');

            const historyMessages = await fetchConversationHistory(message.channel);
            const requestBody = oaiApi.buildRequestBody(historyMessages, userMessage, action);

            const responseData = await oaiApi.sendRequest(requestBody);
            const replyContent = this.processResponse(responseData);

            if (replyContent) {
                const messagesToSend = splitMessage(replyContent, 2000);
                for (const msg of messagesToSend) {
                    await message.channel.send(msg);
                }
            }
        } catch (error) {
            logger.error(`[oai] Error in execute: ${error.message}`);
            await message.reply(getRandomErrorMessage());
        }
    }

    processResponse(data) {
        if (data && data.choices && data.choices.length > 0) {
            let content = data.choices[0].message.content.trim();
            const pattern = /^<@\w+>: /;
            content = content.replace(pattern, '');
            return content;
        }
        return 'No response from the server.';
    }
}

module.exports = new OaiCommand();
