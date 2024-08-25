import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:command:server');

export async function executeServerCommand(message: IMessage, args: string[]): Promise<void> {
    debug('executeServerCommand: Received command with message ID ' + message.getMessageId() + ' and args: ' + args.join(', '));

    try {
        debug('executeServerCommand: Executing server command logic');
        // Execute server command logic
        debug('executeServerCommand: Successfully executed server command with args: ' + args.join(', '));
    } catch (error: any) {
        debug('Error executing server command: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
