import axios from 'axios';
import { ICommand } from '@src/comma@command/types/CommandHandler';
import logger from '@src/utils/logger';
import { getRandomErrorMessage } from '../../common/errors/errorMessages';

/**
 * CommandHandler to interact with the OpenAI API for generating text responses.
 * Usage: !oai <prompt>
 */
export class OAICommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = 'oai';
        this.description = 'Interacts with the OpenAI API to generate responses.';
    }

    /**
     * Executes the OAI command using the provided message context and arguments.
     * @param args - The arguments provided with the command.
     * @returns A promise resolving with the execution result.
     */
    async execute(args: string[]): Promise<{ success: boolean, message: string, error?: string }> {
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
        } catch (error: any) {
            logger.error('OAICommand execute error: ' + error.message);
            return { success: false, message: getRandomErrorMessage(), error: error.message };
        }
    }
}
