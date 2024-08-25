import DiscordManager from '@src/message/discord/DiscordManager';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Processes a command within a message and triggers the appropriate responses.
 *
 * @param message - The message containing the command.
 */
export async function processCommand(message: IMessage): Promise<void> {
    try {
        const content = message.content.toLowerCase();
        if (content.startsWith('!ai')) {
            const discordManager = DiscordManager.getInstance(message.client);
            await discordManager.processAIResponse(message, [], Date.now());
        }
    } catch (error: any) {
        console.error('[processCommand] Error processing command:', error);
    }
}
