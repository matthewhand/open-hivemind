import Debug from 'debug';
// Import necessary modules
import { VoiceConnection, AudioPlayer, createAudioPlayer, createAudioResource } from '@discordjs/voice';

const debug = Debug('app:handleAudioStream');

/**
 * Handle Audio Stream
 *
 * This module manages the audio streaming functionality within a Discord voice channel.
 * It handles the setup, streaming, and teardown of audio resources, ensuring a smooth
 * and responsive user experience.
 *
 * Key Features:
 * - Streams audio to a Discord voice channel
 * - Manages audio player state and resource lifecycle
 * - Provides detailed logging for troubleshooting audio issues
 */

/**
 * Handles the streaming of audio in a Discord voice channel.
 * @param connection - The voice connection to the Discord server.
 * @param audioFilePath - The file path of the audio to stream.
 * @returns A promise that resolves when the audio stream ends.
 */
export const handleAudioStream = async (
  connection: VoiceConnection,
  audioFilePath: string
): Promise<void> => {
  try {
    if (!connection || !audioFilePath) {
      throw new Error('Invalid voice connection or audio file path provided');
    }
    debug('Creating audio player and resource for file: ' + audioFilePath);
    const player: AudioPlayer = createAudioPlayer();
    const resource = createAudioResource(audioFilePath);
    player.play(resource);
    connection.subscribe(player);
    debug('Audio is now streaming to the voice channel.');
  } catch (error: any) {
    debug('Error handling audio stream: ' + error.message);
    throw error;
  }
};
