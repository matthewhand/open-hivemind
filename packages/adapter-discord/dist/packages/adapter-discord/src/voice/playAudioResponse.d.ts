import type { Client, GuildMember } from 'discord.js';
/**
 * Plays an audio response in a Discord voice channel.
 *
 * This function handles the connection to a Discord voice channel and plays the specified audio file. It uses settings
 * from discordConfig to locate the audio files and manage the playback. Detailed debugging and error handling are included
 * to ensure reliable playback and to handle any issues that arise.
 *
 * Key Features:
 * - **Voice Channel Management**: Joins the voice channel and handles connection events.
 * - **Audio Playback**: Plays the specified audio file using Discord.js voice utilities.
 * - **Debugging and Error Handling**: Includes detailed logging for connection status and playback issues.
 */
export declare function playAudioResponse(client: Client, guildMember: GuildMember, fileName: string): Promise<void>;
//# sourceMappingURL=playAudioResponse.d.ts.map