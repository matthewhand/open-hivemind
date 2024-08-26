import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:serverCommand');

/**
 * Execute Server Command
 * 
 * Handles the execution of server-related commands received through Discord messages.
 * Provides detailed logging for each step, including the receipt of the command, execution logic,
 * and any errors encountered during the process.
 * 
 * @param message - The message that triggered the command.
 * @param args - The arguments passed with the command.
 */
export async function executeServerCommand(message: IMessage, args: string[]): Promise<void> {
    debug('executeServerCommand: Received command with message ID ' + message.getMessageId() + ' and args: ' + args.join('  '));
    try {
        debug('executeServerCommand: Executing server command logic');
        // Execute server command logic
        debug('executeServerCommand: Successfully executed server command with args: ' + args.join('  '));
    } catch (error: any) {
        debug('Error executing server command: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
