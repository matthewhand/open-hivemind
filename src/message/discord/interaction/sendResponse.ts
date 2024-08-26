import Debug from "debug";
import { Client, TextChannel } from 'discord.js';

const debug = Debug('app:sendResponse');

/**
 * Sends a response message to a specified Discord channel,
 * automatically handling messages that exceed Discord's character limit.
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel where the message will be sent.
 * @param {string} messageText - The content of the message to be sent.
 * @returns {Promise<void>}
 */
export async function sendResponse(client: Client, channelId: string, messageText: string): Promise<void> {
    // Guard clause: Ensure message text and channel ID are provided
    if (!messageText) {
        debug('sendResponse: Undefined or null messageText provided.');
        return;
    }
    if (!channelId) {
        debug('sendResponse: Undefined or null channelId provided.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        if (!channel) {
            debug('sendResponse: Failed to fetch channel with ID ' + channelId);
            return;
        }

        // Split message into parts if it exceeds Discord's character limit
        const messageParts = splitMessage(messageText);
        for (const part of messageParts) {
            await channel.send(part);
            debug('sendResponse: Part of the message sent to channel ID ' + channelId);
        }
    } catch (error: any) {
        debug('sendResponse: Error sending message to channel ID ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
