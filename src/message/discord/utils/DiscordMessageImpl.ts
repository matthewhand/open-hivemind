import { Client, Message } from 'discord.js';

class DiscordMessageImpl {
    constructor(private client: Client) {}

    public async handleMessage(message: Message): Promise<void> {
        debug.info('Handling message:', message.content);
    }
}

export default DiscordMessageImpl;
