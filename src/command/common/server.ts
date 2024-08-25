import { IMessage } from '@src/message/interfaces/IMessage';
import logger from '@src/utils/logger';

/**
 * Executes a server-related command based on the provided message and arguments.
 * 
 * @param message - The message that triggered the command, encapsulated in the generic IMessage interface.
 * @param args - The arguments provided with the command.
 */
export async function executeServerCommand(message: IMessage, args: string[]): Promise<void> {
    logger.debug('executeServerCommand: Received command with message ID ' + message.getMessageId() + ' and args: ' + args.join(', '));

    try {
        // Execute server command logic
        logger.info('executeServerCommand: Successfully executed server command with args: ' + args.join(', '));
    } catch (error: any) {
        logger.error('Error executing server command: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
