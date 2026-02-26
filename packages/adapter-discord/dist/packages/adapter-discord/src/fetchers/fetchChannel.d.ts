import type { Client } from 'discord.js';
import { TextChannel } from 'discord.js';
/**
 * Fetch Channel
 *
 * This function fetches a channel by its ID using the provided Discord client.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch.
 * @returns A promise that resolves to the channel object or null if not found.
 */
export declare function fetchChannel(client: Client, channelId: string): Promise<TextChannel | null>;
//# sourceMappingURL=fetchChannel.d.ts.map