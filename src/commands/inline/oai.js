const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');
const oaiApi = require('../../managers/oaiApiManager');
const constants = require('../../config/constants'); // Import constants

class OaiCommand extends Command {
    constructor() {
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    async execute(message, args) {
        // Simplified logic assuming sendLlmRequest handles everything now
        if (!args || args.trim() === '') {
            logger.warn('[oai] No arguments provided to oai command.');
            await message.reply('Error: No arguments provided.');
            return;
        }

        // You can still do additional stuff here if needed before calling sendLlmRequest
        // For instance, if you need to modify the message or args before sending
        try {
            // sendLlmRequest now internally handles fetching, trimming, and sending the request
            await sendLlmRequest(message);
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
