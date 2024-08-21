import axios from 'axios';
import { ICommand } from '@command/types/ICommand';
import logger from '@utils/logger';

/**
 * Command to search online using perplexity.ai for the provided text.
 * Usage: !perplexity <text>
 */
export class PerplexityCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = 'perplexity';
        this.description = 'Searches online using perplexity.ai for the provided text. Usage: !perplexity [text]';
    }

    /**
     * Executes the Perplexity command using provided arguments and context.
     * @param args - The arguments and context for the command.
     * @returns A promise resolving with the execution result.
     */
    async execute(args: string[]): Promise<{ success: boolean, message: string, error?: string }> {
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
                process.env.PERPLEXITY_URL || '',
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
        } catch (error: any) {
            logger.error('PerplexityCommand: Execute error: ' + error.message);
            return { success: false, message: 'An error occurred while processing your Perplexity request.', error: error.message };
        }
    }
}
