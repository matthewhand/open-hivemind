import Debug from "debug";
import { TextChannel } from 'discord.js';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Sends a follow-up message to a specific channel.
 *
 * @param message - The original message triggering the follow-up.
 * @param channelId - The ID of the channel to send the follow-up to.
 * @param topic - The topic of the follow-up message.
 */
export async function sendFollowUp(message: IMessage, channelId: string, topic: string): Promise<void> {
    const channel = await message.client.channels.fetch(channelId) as TextChannel;
    if (channel && channel.send) {
        await channel.send(`Follow-up on ${topic}: ${message.getText()}`);
    } else {
        throw new Error('Unable to find channel or send message');
    }
}
