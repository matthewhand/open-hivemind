import fs from 'fs';
import path from 'path';
import util from 'util';
import Debug from 'debug';
import OpenAI from 'openai';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  type VoiceConnection,
} from '@discordjs/voice';
import discordConfig from '@config/discordConfig';
import openaiConfig from '@config/openaiConfig';

const debug = Debug('app:playWelcomeMessage');

const defaultDir = './data/';
const defaultFileName = 'welcome.mp3';

const audioDir = (discordConfig.get('DISCORD_AUDIO_DIR') as string) || defaultDir;
const outputPath = path.join(audioDir, defaultFileName);

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const allowedVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type AllowedVoice = (typeof allowedVoices)[number];

function isAllowedVoice(voice: string): voice is AllowedVoice {
  return allowedVoices.includes(voice as AllowedVoice);
}

/**
 * Play Welcome Message
 *
 * This function plays a welcome message in a Discord voice channel. It uses the OpenAI API to generate the speech,
 * and stores the generated audio file in a configurable path. If the audio file already exists, it is reused to
 * minimize API requests. The function handles errors, missing configurations, and logs relevant information.
 *
 * Key Features:
 * - Speech generation using OpenAI's text-to-speech capability
 * - Configurable audio file storage path
 * - Plays audio in a Discord voice channel
 * - Reuses existing audio files when possible to minimize API requests
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the welcome message.
 * @returns {Promise<void>} - A promise that resolves when the welcome message has been played.
 */
export async function playWelcomeMessage(connection: VoiceConnection): Promise<void> {
  if (!discordConfig || !openaiConfig) {
    debug('Configuration is not properly loaded.');
    return;
  }

  const welcomeMessage =
    (discordConfig.get('DISCORD_WELCOME_MESSAGE') as string) || 'Welcome to the server!';
  const model = 'tts-1';
  let voice: AllowedVoice = 'fable';

  // Use OPENAI_VOICE if it exists and is valid
  if (
    openaiConfig.get('OPENAI_VOICE') &&
    isAllowedVoice(openaiConfig.get('OPENAI_VOICE') as string)
  ) {
    voice = openaiConfig.get('OPENAI_VOICE') as AllowedVoice;
  }

  debug('Playing welcome message: ' + welcomeMessage);

  const openai = new OpenAI({
    apiKey: (openaiConfig.get('OPENAI_API_KEY') as string) || '',
  });

  if (fs.existsSync(outputPath)) {
    debug(`File ${outputPath} already exists. Playing existing file.`);
  } else {
    try {
      const response = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: welcomeMessage,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      const writeFile = util.promisify(fs.writeFile);
      await writeFile(outputPath, buffer);
    } catch (error: any) {
      debug('Error generating welcome message: ' + error.message);
      if (error.response) {
        debug('Response status: ' + error.response.status);
        debug('Response data: ' + JSON.stringify(error.response.data));
      }
      debug(error.stack);
      return;
    }
  }

  try {
    const player = createAudioPlayer();
    const resource = createAudioResource(outputPath);
    player.play(resource);
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => {
      fs.unlinkSync(outputPath);
    });
    player.on('error', (error) => {
      debug('Error playing welcome message: ' + error.message);
      debug(error.stack);
    });
  } catch (error: any) {
    debug('Error playing audio file: ' + error.message);
    debug(error.stack);
  }
}
