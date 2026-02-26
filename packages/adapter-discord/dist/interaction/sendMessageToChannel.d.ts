import type { Client, Message } from 'discord.js';
/**
 * Sends a message to a specific Discord channel.
 *
 * This function retrieves the channel by its ID, sends the specified message content to the channel, and logs the process.
 * It includes error handling to log and manage any issues that occur during message sending.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param messageContent - The content of the message to be sent.
 * @returns {Promise<Message | void>} The sent message object or void if an error occurs.
 */
export declare function sendMessageToChannel(client: Client, channelId: string, messageContent: string): Promise<Message | void>;
//# sourceMappingURL=sendMessageToChannel.d.ts.map