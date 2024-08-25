import { Client, Message } from 'discord.js';
import debug from '@src/operations/debug';

class DiscordMessageImpl {
    constructor(private client: Client) {}

    public async handleMessage(message: Message): Promise<void> {
        debug.info('Handling message:', message.content);
    }
}

export default DiscordMessageImpl;
