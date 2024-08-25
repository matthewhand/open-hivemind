import Debug from 'debug';
import axios from 'axios';
import ICommand from '@src/command/interfaces/ICommand';

const debug = Debug('app:command:memgpt');

/**
 * Returns a random error message from a predefined set.
 * 
 * @returns {string} A random error message.
 */
function getRandomErrorMessage(): string {
    const errorMessages = [
        'Something went wrong. Please try again later.',
        'An error occurred. Please check your input and try again.',
        'We encountered an unexpected issue. Please try once more.'
    ];
    return errorMessages[Math.floor(Math.random() * errorMessages.length)];
}

/**
 * CommandHandler to interact with the MemGPT service.
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

            debug('MemGPTCommand: Request sent to MemGPT for agent ' + action + ' with message: ' + messageContent);
            debug('MemGPTCommand: Response received from MemGPT with data: ' + response.data);
            return { success: true, message: response.data };
        } catch (error: any) {
            debug('MemGPTCommand execute error: ' + error.message);
            return { success: false, message: getRandomErrorMessage(), error: error.message };
        }
    }
}
