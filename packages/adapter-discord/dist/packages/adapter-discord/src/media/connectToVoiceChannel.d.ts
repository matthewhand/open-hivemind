import type { Client } from 'discord.js';
import { VoiceChannel } from 'discord.js';
/**
 * Connect to Voice Channel
 *
 * This function handles the connection of the bot to a specified Discord voice channel. It includes logic to simulate a
 * connection delay and handles any errors that may occur during the connection process.
 *
 * Key Features:
 * - Fetches and validates the specified voice channel using the provided channel ID.
 * - Simulates a delay before establishing the connection to the voice channel.
 * - Logs key actions and errors for easier debugging and maintenance.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the voice channel to connect to.
 * @returns A promise that resolves to the connected voice channel instance.
 */
export declare function connectToVoiceChannel(client: Client, channelId: string): Promise<VoiceChannel>;
//# sourceMappingURL=connectToVoiceChannel.d.ts.map