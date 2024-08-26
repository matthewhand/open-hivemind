import Debug from "debug";

import { IMessage } from '@src/message/interfaces/IMessage';
import { Client } from 'discord.js';
 * Sends a follow-up message to the specified channel.
 * @param client - The Discord client instance.
 * @param message - The original message that triggered the follow-up.
 * @param channelId - The ID of the channel to send the follow-up message to.
 * @param topic - The topic of the follow-up message.
 */
export async function sendFollowUp(client: Client, message: IMessage, channelId: string, topic: string): Promise<void> {
    const followUpContent = 'Continuing the discussion on: ' + topic;
    debug('Sending follow-up message to channel ID: ' + channelId + '. Topic: ' + topic);
    await sendMessageToChannel(client, channelId, followUpContent);
}
