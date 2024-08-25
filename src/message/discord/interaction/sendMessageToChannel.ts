import Debug from "debug";
const debug = Debug("app");

import { Client, Message, TextChannel } from 'discord.js';
import Debug from 'debug';
const debug = Debug('app:discord:sendMessageToChannel');
/**
 * Sends a message to a specific Discord channel.
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param messageContent - The content of the message to be sent.
 * @returns The sent message object or void if an error occurs.
 */
export async function sendMessageToChannel(client: Client, channelId: string, messageContent: string): Promise<Message | void> {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
        debug('Channel with ID ' + channelId + ' not found.');
        return;
    }
    try {
        const sentMessage = await channel.send(messageContent);
        debug('Message sent to channel ID ' + channelId + ': ' + messageContent);
        return sentMessage;
    } catch (error: any) {
        debug('Error sending message to channel ID ' + channelId + ': ' + error);
    }
}
