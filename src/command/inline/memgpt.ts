import axios from 'axios';
import { ICommand } from '@src/command/types/Command';
import logger from '@src/utils/logger';
import { getRandomErrorMessage } from '../../common/errors/errorMessages';

/**
 * Command to interact with the MemGPT service.
 * Usage: !memgpt <action> <message>
 */
export class MemGPTCommand implements ICommand {
    name: string;
    description: string;

    constructor() {
        this.name = 'memgpt';
        this.description = 'Interacts with the MemGPT service to send and receive messages.';
    }

    /**
     * Executes the MemGPT command using the provided message context and arguments.
     * @param args - The arguments provided with the command.
     * @returns A promise resolving with the execution result.
     */
    async execute(args: string[]): Promise<{ success: boolean, message: string, error?: string }> {
        const action = args[0]; // Assuming 'action' is the first argument
        const messageContent = args.slice(1).join(' '); // Joining the remaining arguments

        try {
            const requestUrl = process.env.MEMGPT_ENDPOINT_URL + '/api/agents/message';
            const userId = process.env.MEMGPT_USER_ID;
            const memGptApiKey = process.env.MEMGPT_API_KEY;
            const headers = memGptApiKey ? { 'Authorization': 'Bearer ' + memGptApiKey } : {};

            const response = await axios.post(requestUrl, {
                agent_id: action,
                user_id: userId,
                message: messageContent
            }, { headers });

            logger.debug('MemGPTCommand: Request sent to MemGPT for agent ' + action + ' with message: ' + messageContent);
            logger.debug('MemGPTCommand: Response received from MemGPT with data: ' + response.data);

            return { success: true, message: response.data };
        } catch (error: any) {
            logger.error('MemGPTCommand execute error: ' + error.message);
            return { success: false, message: getRandomErrorMessage(), error: error.message };
        }
    }
}
