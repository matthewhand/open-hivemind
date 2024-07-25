const axios = require('axios');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');

/**
 * Command to search online using perplexity.ai for the provided text.
 * Usage: !perplexity <text>
 */
class PerplexityCommand extends ICommand {
    constructor() {
        super();
        this.name = 'perplexity';
        this.description = 'Searches online using perplexity.ai for the provided text. Usage: !perplexity [text]';
    }

    /**
     * Executes the Perplexity command using provided arguments and context.
     * @param {Object} args - The arguments and context for the command.
     * @returns {Promise<CommandResponse>} - The result of the command execution.
     */
    async execute(args) {
        // const message = args.message;
        const query = args.join(' ');  // Assuming args is an array of words

        if (!query) {
            logger.warn('PerplexityCommand: No query provided for Perplexity.');
            return { success: false, message: 'Please provide a query for Perplexity.' };
        }

        try {
            const messages = [];

            if (process.env.PERPLEXITY_SYSTEM_PROMPT) {
                messages.push({ role: 'system', content: process.env.PERPLEXITY_SYSTEM_PROMPT });
            }

            messages.push({ role: 'user', content: query });

            logger.debug('PerplexityCommand: Sending request with messages: ' + JSON.stringify(messages));
            const perplexityResponse = await axios.post(
                process.env.PERPLEXITY_URL,
                { model: process.env.PERPLEXITY_MODEL || 'mistral-7b-instruct', messages },
                { headers: { 'Authorization': 'Bearer ' + process.env.PERPLEXITY_API_KEY } }
            );

            if (perplexityResponse.status === 200 && perplexityResponse.data.choices && perplexityResponse.data.choices.length > 0) {
                const assistantMessage = perplexityResponse.data.choices[0].message.content;
                logger.info('PerplexityCommand: Received response successfully.');
                return { success: true, message: 'Perplexity response: ' + assistantMessage };
            } else {
                logger.error('PerplexityCommand: Error from API: Status ' + perplexityResponse.status);
                return { success: false, message: 'An error occurred while processing your Perplexity request.' };
            }
        } catch (error) {
            logger.error('PerplexityCommand: Execute error: ' + error.message);
            return { success: false, message: 'An error occurred while processing your Perplexity request.', error: error.toString() };
        }
    }
}

module.exports = PerplexityCommand;  // Correct: Exports the class for dynamic instantiation
