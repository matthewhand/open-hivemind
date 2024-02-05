const axios = require('axios');
const Command = require('../utils/Command');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const fetchConversationHistory = require('../utils/fetchConversationHistory');
const { getRandomErrorMessage } = require('../config/errorMessages');
const { splitMessage } = require('../utils/common');

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    buildOaiRequestBody(historyMessages, userMessage, model = 'gpt-3.5-turbo') {
        let requestBody = {
            model: model,
            messages: [{ role: 'system', content: constants.SYSTEM_PROMPT }]
        };

        let currentSize = JSON.stringify(requestBody).length;
        historyMessages.slice().reverse().forEach(msg => {
            const formattedMessage = `<@${msg.userId}>: ${msg.content}`;
            const messageObj = { role: 'user', content: formattedMessage };
            currentSize += JSON.stringify(messageObj).length;
            if (currentSize <= constants.MAX_CONTENT_LENGTH) {
                requestBody.messages.push(messageObj);
            }
        });

        requestBody.messages.push({ role: 'user', content: userMessage });
        return requestBody;
    }

    validateRequestBody(requestBody) {
        return requestBody && Array.isArray(requestBody.messages) && requestBody.messages.length > 0;
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

    async execute(message, args) {
        try {
            const action = args.split(' ')[0] || 'gpt-3.5-turbo'; // Default model if none specified
            const userMessage = args.split(' ').slice(1).join(' '); // The rest of the message after the action

            logger.debug(`[oai] Command invoked with action: ${action}, args: ${userMessage}`);

            const historyMessages = await fetchConversationHistory(message.channel);
            logger.debug(`[oai] Fetched ${historyMessages.length} history messages for request construction`);

            const requestBody = this.buildOaiRequestBody(historyMessages, userMessage, action);
            logger.debug(`[oai] Request body constructed: ${JSON.stringify(requestBody, null, 2)}`);

            if (!this.validateRequestBody(requestBody)) {
                throw new Error('Invalid request body');
            }

            logger.info(`[oai] Sending request to LLM API`);
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` })
                }
            });

            logger.info(`[oai] Received response from LLM API: Status ${response.status}`);
            const replyContent = this.processResponse(response.data);
            logger.debug(`[oai] Processed response content: ${replyContent}`);

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
}

module.exports = new OaiCommand();
