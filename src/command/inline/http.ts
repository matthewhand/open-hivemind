import { ICommand } from '@command/types/ICommand';
import logger from '@utils/logger';

/**
 * HTTPCommand class to handle HTTP requests.
 */
export class HTTPCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = 'http';
        this.description = 'Executes HTTP requests. Usage: !http <url>';
    }

    /**
     * Executes the HTTP command.
     * @param args - The arguments passed with the HTTP command.
     * @returns A promise resolving with the execution result.
     */
    async execute(args: string[]): Promise<{ success: boolean, message: string, data?: any, error?: string }> {
        if (args.length === 0) {
            logger.error('HTTPCommand: No URL provided');
            return { success: false, message: 'Please provide a URL.' };
        }

        const url = args[0];
        try {
            const response = await fetch(url);
            const data = await response.json();
            logger.info('HTTPCommand: Successfully fetched data from ' + url);
            return { success: true, message: 'Data fetched successfully', data };
        } catch (error: any) {
            logger.error('HTTPCommand: Error fetching data from ' + url + ' - ' + error.message);
            return { success: false, message: 'Failed to fetch data', error: error.message };
        }
    }
}
