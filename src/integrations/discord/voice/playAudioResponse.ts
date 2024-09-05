import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection } from '@discordjs/voice';
import { Client, GuildMember, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:playAudioResponse');

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
export async function playAudioResponse(client: Client, guildMember: GuildMember, fileName: string): Promise<void> {
    try {
        const voiceChannel = guildMember.voice.channel as VoiceChannel;
        if (!voiceChannel) {
            throw new Error('User is not in a voice channel.');
        }

        const audioDirectory = discordConfig.get('DISCORD_AUDIO_FILE_PATH') as string; // Fix: Correct type and key
        const audioFilePath = path.join(audioDirectory, fileName); // Fix: Ensure path uses proper directory
        debug(`Playing audio file: ${audioFilePath}`);

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator as unknown as (guild: VoiceBasedChannel) => unknown,
        });

        connection.on('stateChange', (oldState, newState) => {
            debug(`Connection transitioned from ${oldState.status} to ${newState.status}`);
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(audioFilePath);
        player.play(resource);

        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            debug('Audio is now playing!');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            debug('Audio playback is complete.');
            connection.destroy();
        });

        player.on('error', (error) => {
            debug(`Error during audio playback: ${error.message}`);
            debug(error.stack); // Improvement: log stack trace for better debugging
            connection.destroy();
            throw error;
        });
    } catch (error: any) {
        debug('Failed to play audio response: ' + error.message);
        debug(error.stack); // Improvement: log stack trace for better debugging
        throw error;
    }
}
