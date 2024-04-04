const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const OpenAiManager = require('../../managers/OpenAiManager').getInstance();

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]. Defaults to gpt-3.5-turbo if no model specified.');
    }

    async execute(message, args) {
        if (!args || args.trim() === '') {
            logger.warn('[oai] No arguments provided to oai command.');
            await message.reply('Error: No arguments provided.');
            return;
        }

        // Splitting arguments and establishing a default model
        const defaultModel = 'gpt-3.5-turbo';
        const parts = args.split(' ');
        let model = defaultModel, query;

        // If the first part of the command contains a model specifier (indicated by a colon)
        if (parts[0].includes(':')) {
            [model, ...parts] = parts[0].split(':');
            query = parts.join(' ') + ' ' + parts.slice(1).join(' ');
        } else {
            query = parts.join(' ');
        }

        try {
            const requestBody = OpenAiManager.buildRequestBody({
                model: model || defaultModel, // Use specified model or default
                messages: [{
                    isFromBot: () => false, // Simulate a user message
                    getText: () => query.trim()
                }],
                context: `You are a helpful assistant talking to ${message.author.username}.`,
            });

            const data = await OpenAiManager.sendRequest(requestBody);
            const responseContent = this.processResponse(data);
            await message.reply(responseContent);
        } catch (error) {
            logger.error(`[oai] Error executing command: ${error.message}`, error);
            await message.reply(getRandomErrorMessage());
        }
    }
    
    processResponse(data) {
        if (!data || !data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
            logger.warn('[oai] Inadequate response data from the server.');
            return 'No meaningful response from the server.';
        }

        const content = data.choices[0].message.content.trim().replace(/^<@\w+>: /, '');

        if (content === '') {
            logger.warn('[oai] Response content is empty after processing.');
            return 'No meaningful response from the server.';
        }

        return content;
    }
}

module.exports = new OaiCommand();
