import { ParsedCommand, parseCommand } from './parseCommand';
import { handleStatusCommand } from './statusCommand';

/**
 * Routes parsed commands to their respective handlers.
 *
 * @param {string} commandContent - The raw command message from Slack.
 * @returns {Promise<string | null>} The response message or null if the command is unrecognized.
 */
export async function routeCommand(commandContent: string): Promise<string | null> {
    const parsed: ParsedCommand | null = parseCommand(commandContent);

    if (!parsed) {
        return null;
    }

    try {
        switch (parsed.commandName) {
            case 'status':
                return await handleStatusCommand(parsed.args);
            // Add additional command handlers here as needed
            default:
                return `Unrecognized command: ${parsed.commandName}`;
        }
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}