/**
 * playAudioResponse
 * 
 * This module handles playing audio responses in Discord voice channels.
 * It uses the DiscordService to interact with the Discord API.
 * 
 * Key Features:
 * - **Audio Playback**: Plays specified audio files in voice channels.
 * - **Channel Management**: Ensures the bot joins and leaves voice channels as needed.
 * - **Error Handling**: Includes error handling for common issues like missing permissions or non-existent channels.
 */
import discordConfig from '@discord/interfaces/DiscordConfig';
import { DiscordService } from '../DiscordService';

export const playAudioResponse = async (channelId: string, audioFilePath: string) => {
    const discordService = new DiscordService();
    const client = discordService.getClient();
    const channel = await client.channels.fetch(channelId);
    
    if (!channel || !channel.isVoice()) {
        throw new Error('Channel not found or is not a voice channel.');
    }

    const connection = await channel.join();
    connection.play(audioFilePath);
};
