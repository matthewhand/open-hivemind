import logger from '@src/utils/logger';
import { Client } from 'discord.js';

export function setMessageHandler(client: Client, messageHandlerCallback: (message: any) => void): void {
    client.on('messageCreate', messageHandlerCallback);
    logger.info('Message handler has been set.');
}
