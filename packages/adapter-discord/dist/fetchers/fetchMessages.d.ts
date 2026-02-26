import type { TextChannel } from 'discord.js';
import type { IMessage } from '@src/message/interfaces/IMessage';
/**
 * Fetch Messages
 *
 * This function fetches the last 50 messages from a specified channel.
 *
 * @param channel - The TextChannel to fetch messages from.
 * @returns A promise that resolves to an array of IMessage objects.
 */
export declare function fetchMessages(channel: TextChannel): Promise<IMessage[]>;
//# sourceMappingURL=fetchMessages.d.ts.map