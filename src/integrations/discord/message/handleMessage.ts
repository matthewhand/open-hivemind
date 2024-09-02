import Debug from 'debug';
import { Message } from 'discord.js';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';

const log = Debug('app:handleMessage');

/**
 * Handles incoming Discord messages, converting them to IMessage and
 * invoking the provided handler function.
 * 
 * @param message - The incoming Discord message.
 * @param messageHandler - The handler function to process the IMessage.
 */
export const handleMessage = (message: Message<boolean>, messageHandler: (message: IMessage) => void): void => {
    log(`Received a message with ID: ${message.id}`);
    const iMessage: IMessage = new DiscordMessage(message);
    messageHandler(iMessage);
};
