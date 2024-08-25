import { Client, Message } from 'discord.js';
import logger from '@src/utils/logger';

/**
 * Sets a message handler for the Discord client.
 * 
 * @param client - The Discord client instance.
 * @param handler - The function to handle incoming messages.
 */
export function setMessageHandler(client: Client, handler: (message: Message) => void): void {
    logger.info('DiscordManager: Setting message handler');
    client.on('messageCreate', handler);
}
