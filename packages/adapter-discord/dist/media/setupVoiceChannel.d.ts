import type { Client, VoiceChannel } from 'discord.js';
/**
 * Setup Voice Channel
 *
 * This function handles the setup of a voice channel in Discord.
 * It ensures that the channel is ready for use and manages any necessary configurations.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to set up.
 * @returns The configured voice channel object.
 */
export declare function setupVoiceChannel(client: Client, channelId: string): Promise<VoiceChannel | null>;
//# sourceMappingURL=setupVoiceChannel.d.ts.map