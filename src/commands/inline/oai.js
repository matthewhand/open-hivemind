const axios = require('axios');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

/**
 * Command to interact with the OpenAI API for generating text responses.
 * Usage: !oai <prompt>
 */
class OAICommand extends ICommand {
    constructor() {
        super();
        this.name = 'oai';
        this.description = 'Interacts with the OpenAI API to generate responses.';
    }

    /**
     * Executes the OAI command using the provided message context and arguments.
     * @param {Object} message - The Discord message object that triggered the command.
     * @param {string[]} args - The arguments provided with the command.
     * @returns {Promise<CommandResponse>} - The result of the command execution.
     */
    async execute(args) {
        // const message = args.message;
        const prompt = args.join(' ');  // Combining all arguments to form the prompt
        logger.info('OAICommand: Generating response for prompt: ' + prompt);

        try {
            const response = await axios.post('https://api.openai.com/v1/engines/davinci/completions', {
                prompt: prompt,
                max_tokens: 150
            }, {
                headers: {
                    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
                }
            });

            if (response.data.choices && response.data.choices.length > 0) {
                const generatedText = response.data.choices[0].text.trim();
                logger.info('OAICommand: Response generated successfully');
                return { success: true, message: generatedText };
            } else {
                logger.warn('OAICommand: No response generated.');
                return { success: false, message: 'Failed to generate response.' };
            }
        } catch (error) {
            logger.error('OAICommand execute error: ' + error);
            return { success: false, message: getRandomErrorMessage(), error: error.toString() };
        }
    }
}

module.exports = OAICommand;  // Correct: Exports the class for dynamic instantiation
