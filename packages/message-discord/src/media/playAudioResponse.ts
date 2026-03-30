import fs from 'fs';
import util from 'util';
import axios from 'axios';
import Debug from 'debug';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  type VoiceConnection,
} from '@discordjs/voice';
import openaiConfig from '@config/openaiConfig';

const debug = Debug('app:playAudioResponse');

/**
 * Play Audio Response
 *
 * This function converts a given text to speech using a remote narration service and plays the resulting audio in the connected
 * Discord voice channel. It manages the conversion request, handles errors, and ensures the audio is played back smoothly.
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the audio response.
 * @param {string} text - The text to convert to speech and play.
 * @returns A promise that resolves when the audio response has been played.
 */
export async function playAudioResponse(connection: VoiceConnection, text: string): Promise<void> {
  if (!openaiConfig) {
    debug('OpenAI configuration is not loaded.');
    return;
  }

  const narrationEndpointUrl = openaiConfig.get('OPENAI_BASE_URL') as string;

  if (!narrationEndpointUrl) {
    debug('OPENAI_BASE_URL is not set in the configuration.');
    return;
  }

  debug('OPENAI_BASE_URL: ' + narrationEndpointUrl);

  try {
    const response = await axios.post(
      narrationEndpointUrl,
      {
        input: text,
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' },
      },
      {
        headers: {
          Authorization: ('Bearer ' + openaiConfig.get('OPENAI_API_KEY')) as string,
        },
      }
    );

    const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
    const writeFile = util.promisify(fs.writeFile);
    await writeFile('output.mp3', audioBuffer);

    const player = createAudioPlayer();
    const resource = createAudioResource('output.mp3');
    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      fs.unlinkSync('output.mp3');
    });

    player.on('error', (error) => {
      debug('Error playing audio response: ' + error.message);
      debug(error.stack); // Improvement: Added stack trace logging for better debugging
    });
  } catch (error: any) {
    if (error.response?.status === 408) {
      debug('Request timed out. Retrying...'); // Improvement: Added timeout handling
      return playAudioResponse(connection, text);
    }
    debug(
      'Error generating or playing audio response: ' +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
