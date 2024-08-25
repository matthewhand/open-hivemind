import { Client } from 'discord.js';
import { VoiceConnection } from '@discordjs/voice';
import { setupVoiceChannel } from '../voice/setupVoiceChannel';
import { playWelcomeMessage } from '../voice/playWelcomeMessage';

/**
 * Connects to a specified voice channel and plays a welcome message.
 * 
 * @param client - The Discord client instance.
 * @param channelId - The ID of the voice channel to connect to.
 * @returns A promise that resolves to the VoiceConnection object.
 */
export async function connectToVoiceChannel(client: Client, channelId: string): Promise<VoiceConnection> {
    debug.info(`DiscordManager: Connecting to voice channel ID: ${channelId}`);
    const connection = await setupVoiceChannel(client);
    debug.info('DiscordManager: Playing welcome message');
    if (connection) {
        playWelcomeMessage(connection);
    }
    return connection!;
}
