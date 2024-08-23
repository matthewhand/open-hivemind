import { Message } from 'discord.js';
import logger from '@src/utils/logger';

export async function executeServerCommand(message: Message, args: string[]): Promise<void> {
    try {
        // ...command execution logic...
    } catch (error: any) {
        logger.error(`Error executing server command: ${(error instanceof Error) ? error.message : 'Unknown error'}`);
    }
}
