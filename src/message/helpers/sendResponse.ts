import { splitMessage } from '../../utils/splitMessage';
import DiscordManager from '../managers/DiscordManager';

export async function sendResponse(client: Client, channelId: string, messageText: string): Promise<void> {
    const maxMessageLength = constants.MESSAGE_MAX_LENGTH;
    const parts = splitMessage(messageText, maxMessageLength);

    for (const part of parts) {
        await DiscordManager.getInstance().sendMessage(channelId, part);
    }
}
