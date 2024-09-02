import { TextChannel } from 'discord.js';
import Debug from 'debug';

const log = Debug('app:sendMessageToChannel');

/**
 * Sends a message to a specified Discord channel.
 * 
 * @param channel - The TextChannel where the message should be sent.
 * @param message - The content of the message to be sent.
 */
export const sendMessageToChannel = async (channel: TextChannel, message: string): Promise<void> => {
    try {
        log(`Sending message to channel ${channel.id}: ${message}`);
        await channel.send(message);
        log(`Message sent to channel ${channel.id} successfully`);
    } catch (error: any) {
        log(`Failed to send message to channel ${channel.id}: ` + error.message);
        throw error;
    }
};
