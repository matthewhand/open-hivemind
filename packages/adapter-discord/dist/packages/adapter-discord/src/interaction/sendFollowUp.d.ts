import type { IMessage } from '@src/message/interfaces/IMessage';
import type { Client } from 'discord.js';
/**
 * Sends a follow-up message to the specified channel.
 * This function is triggered after the initial response has been sent,
 * and is used to keep the conversation active or provide additional information.
 *
 * @param {Client} client - The Discord client instance.
 * @param {IMessage} message - The original message that triggered the follow-up.
 * @param {string} channelId - The ID of the channel to send the follow-up message to.
 * @param {string} topic - The topic of the follow-up message.
 * @returns {Promise<void>} - The function returns a promise that resolves when the follow-up is sent.
 */
export declare function sendFollowUp(client: Client, message: IMessage, channelId: string, topic: string): Promise<void>;
//# sourceMappingURL=sendFollowUp.d.ts.map