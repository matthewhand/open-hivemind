import ConfigurationManager from '@common/config/ConfigurationManager';
import { splitMessage } from '../../utils/splitMessage';
import DiscordManager from '@src/message/discord/DiscordManager';
import { Client } from 'discord.js';

export async function sendResponse(client: Client, channelId: string, messageText: string): Promise<void> {
    const maxMessageLength = ConfigurationManager.MAX_MESSAGE_LENGTH;
    const parts = splitMessage(messageText, maxMessageLength);

    for (const part of parts) {
        await DiscordManager.getInstance().sendMessage(channelId, part);
    }
}
