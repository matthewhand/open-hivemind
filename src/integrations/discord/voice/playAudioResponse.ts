import { VoiceConnection } from '@discordjs/voice';
import Debug from 'debug';
import path from 'path';
import fs from 'fs';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:playAudioResponse');
const configManager = ConfigurationManager.getInstance();
const discordConfig = configManager.getConfig('discord');

/**
 * Plays an audio response in the connected voice channel.
 *
 * @param connection - The voice connection to the Discord channel.
 * @param filePath - The path to the audio file to play.
 */
export async function playAudioResponse(connection: VoiceConnection, filePath: string): Promise<void> {
    if (!discordConfig) {
        throw new Error('Discord configuration is not loaded.');
    }

    // @ts-ignore: Type instantiation is excessively deep and possibly infinite
    const audioDirectory = discordConfig.get<string>('DISCORD_AUDIO_DIRECTORY');
    const fullPath = path.join(audioDirectory, filePath);

    if (!fs.existsSync(fullPath)) {
        debug('Audio file not found:', fullPath);
        throw new Error('Audio file not found.');
    }

    const player = createAudioPlayer();
    const resource = createAudioResource(fullPath);

    player.play(resource);

    connection.subscribe(player);

    player.on(AudioPlayerStatus.Playing, () => {
        debug('Audio is now playing:', fullPath);
    });

    player.on(AudioPlayerStatus.Idle, () => {
        debug('Audio playback finished:', fullPath);
    });
}
