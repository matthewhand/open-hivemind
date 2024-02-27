const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const OpenAiManager = new (require('../../managers/OpenAiManager'))();

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    async execute(message, args) {
        if (!args || args.trim() === '') {
            logger.warn('[oai] No arguments provided to oai command.');
            await message.reply('Error: No arguments provided.');
            return;
        }

        try {
            // Assuming args is a string containing the model and query separated by a space
            const [model, ...queryParts] = args.split(' ');
            const query = queryParts.join(' ');

            // Prepare the historyMessages format if necessary or directly pass the query
            // This part might need adjustment based on how you plan to use the model argument
            const requestBody = OpenAiManager.buildRequestBody([{
                isFromBot: () => false, // Simulate a user message
                getText: () => query
            }], `You are a helpful assistant talking to ${message.author.username}.`);

            // Note: Adjust the buildRequestBody method or prepare a suitable method in OpenAiManager if needed
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
