import Debug from 'debug';
import { Message } from 'discord.js';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { DiscordService } from '@src/integrations/discord/DiscordService';
import discordConfig from '@integrations/discord/interfaces/discordConfig';

const log = Debug('app:handleMessage');

export const handleMessage = async (message: Message<boolean>, messageHandler: (message: IMessage, historyMessages: IMessage[]) => void): Promise<void> => {
    log(`Received a message with ID: ${message.id}`);

    // Convert the current message to IMessage
    const iMessage: IMessage = new DiscordMessage(message);

    // Retrieve message history from the channel
    const discordService = DiscordService.getInstance();
    const channel = message.channel;
    const historyMessages: IMessage[] = [];

    // Fetch the limit from the config
    const messageHistoryLimit = discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') || 10;

    if (channel.isText()) {
        const fetchedMessages = await channel.messages.fetch({ limit: messageHistoryLimit }); // Use config value
        fetchedMessages.forEach((msg) => {
            if (msg.id !== message.id) { // Exclude the current message
                historyMessages.push(new DiscordMessage(msg));
            }
        });
    }

    // Pass both the IMessage and the history to the handler
    messageHandler(iMessage, historyMessages);
};
