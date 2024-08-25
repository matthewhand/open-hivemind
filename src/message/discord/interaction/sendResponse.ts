import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';
import { splitMessage } from '../processing/splitMessage';

const debug = Debug('app:discord:sendResponse');

/**
 * Sends a response message to a specified Discord channel,
 * automatically handling messages that exceed Discord's character limit.
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel where the message will be sent.
 * @param {string} messageText - The content of the message to be sent.
 * @returns {Promise<void>}
 */
export async function sendResponse(client: Client, channelId: string, messageText: string): Promise<void> {
    if (!messageText) {
        debug('sendResponse was called with an undefined or null messageText.');
        return;
    }

    if (!channelId) {
        debug('sendResponse was called with an undefined or null channelId.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        if (!channel) {
            debug('Failed to fetch channel with ID: ' + channelId);
            return;
        }

        const messageParts = splitMessage(messageText);

        for (const part of messageParts) {
            await channel.send(part);
            debug('Message sent to channel ID: ' + channelId);
        }
    } catch (error: any) {
        debug('Error sending message to channel ID ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
