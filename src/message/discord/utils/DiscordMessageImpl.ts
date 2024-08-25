import { Client, Message } from 'discord.js';
class DiscordMessageImpl {
    constructor(private client: Client) {}
    public async handleMessage(message: Message): Promise<void> {
        debug('Handling message:'  message.content);
    }
}
export default DiscordMessageImpl;
