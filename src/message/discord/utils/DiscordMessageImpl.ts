import { Client, Message } from 'discord.js';
import logger from '@src/operations/logger';

class DiscordMessageImpl {
    constructor(private client: Client) {}

    public async handleMessage(message: Message): Promise<void> {
        logger.info('Handling message:', message.content);
    }
}

export default DiscordMessageImpl;
