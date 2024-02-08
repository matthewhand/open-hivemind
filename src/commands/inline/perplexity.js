// commands/perplexity.js
const axios = require('axios');
const Command = require('../../utils/Command');
const logger = require('../../utils/logger');

class PerplexityCommand extends Command {
    constructor() {
        super('perplexity', 'Searches online using perplexity.ai for the provided text. Usage: !perplexity [text]');
    }

    async execute(message, args=null, action=null) {
        const args = message.content.split(' ').slice(1).join(' ');

        if (!args) {
            logger.warn('No query provided for Perplexity.');
            message.reply('Please provide a query for Perplexity.');
            return;
        }

        try {
            const messages = [];

            if (process.env.PERPLEXITY_SYSTEM_PROMPT) {
                messages.push({ role: 'system', content: process.env.PERPLEXITY_SYSTEM_PROMPT });
            }

            messages.push({ role: 'user', content: args });

            logger.debug(`Sending Perplexity request with messages: ${JSON.stringify(messages)}`);
            const perplexityResponse = await axios.post(
                process.env.PERPLEXITY_URL,
                { model: process.env.PERPLEXITY_MODEL || 'mistral-7b-instruct', messages },
                { headers: { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` } }
            );

            if (perplexityResponse.status === 200) {
                const assistantMessage = perplexityResponse.data.choices[0].message.content;
                logger.info('Received Perplexity response successfully.');
                message.reply(`Perplexity response: ${assistantMessage}`);
            } else {
                logger.error(`Error from Perplexity API: Status ${perplexityResponse.status}`);
                message.reply('An error occurred while processing your Perplexity request.');
            }
        } catch (error) {
            logger.error(`Error in execute function of Perplexity request: ${error.message}`);
            message.reply('An error occurred while processing your Perplexity request.');
        }
    }
}

module.exports = new PerplexityCommand();
