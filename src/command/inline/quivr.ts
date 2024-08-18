import axios from 'axios';
import { BaseCommand } from '../types/BaseCommand';
import logger from '../../logging/logger';

/**
 * Command to send queries to the Quivr API based on the specified chat category.
 * Usage: !quivr:[chatCategory] [query]
 */
export class QuivrCommand extends BaseCommand {
    constructor() {
        super('quivr', 'Sends a query to the Quivr API. Usage: !quivr:[chatCategory] [query]');
    }

    async execute(args: string[]): Promise<{ success: boolean, messages?: string[], message?: string, error?: string }> {
        let [chatCategory, ...queryParts] = args.join(' ').split(' ');
        const query = queryParts.join(' ');

        if (!chatCategory) {
            const quivrChats = process.env.QUIVR_CHATS?.split(',') || [];
            return { success: false, message: 'Available Quivr chats: ' + quivrChats.join(', ') };
        }

        if (!query) {
            return { success: false, message: 'Please provide a query for Quivr chat ' + chatCategory + '.' };
        }

        const quivrChatId = process.env['QUIVR_' + chatCategory.toUpperCase() + '_CHAT'];
        const quivrBrainId = process.env['QUIVR_' + chatCategory.toUpperCase() + '_BRAIN'];
        const quivrUrl = process.env.QUIVR_BASE_URL + quivrChatId + '/question?brain_id=' + quivrBrainId;

        logger.debug('QuivrCommand: Sending request to Quivr with query: ' + query);
        try {
            const quivrResponse = await axios.post(
                quivrUrl,
                { question: query },
                { headers: { 'Authorization': 'Bearer ' + process.env.QUIVR_API_KEY } }
            );

            if (quivrResponse.status === 200 && quivrResponse.data.assistant) {
                const quivrResult = quivrResponse.data.assistant;
                const messageChunks = quivrResult.match(/[\s\S]{1,2000}/g) || [quivrResult];
                return { success: true, messages: messageChunks };
            } else {
                logger.error('QuivrCommand: Error from Quivr API: Status ' + quivrResponse.status);
                return { success: false, message: 'An error occurred while processing your Quivr request.' };
            }
        } catch (error: any) {
            logger.error('QuivrCommand: Execute error: ' + error.message);
            return { success: false, message: 'An error occurred while processing your Quivr request.', error: error.message };
        }
    }
}
