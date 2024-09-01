import Debug from 'debug';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection } from '@discordjs/voice';
import axios from 'axios';
import fs from 'fs';
import util from 'util';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:playAudioResponse');
const configManager = ConfigurationManager.getInstance();

// Define explicit type for openaiConfig
interface OpenAiConfig {
    OPENAI_BASE_URL?: string;
    OPENAI_API_KEY?: string;
}

const openaiConfig = configManager.getConfig('openaiConfig') as OpenAiConfig;

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

    const narrationEndpointUrl = openaiConfig.OPENAI_BASE_URL;

    if (!narrationEndpointUrl) {
        debug('OPENAI_BASE_URL is not set in the configuration.');
        return;
    }

    debug('OPENAI_BASE_URL: ' + narrationEndpointUrl);

    try {
        const response = await axios.post(narrationEndpointUrl, {
            input: text,
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' }
        }, {
            headers: {
                'Authorization': 'Bearer ' + openaiConfig.OPENAI_API_KEY,
            },
        });

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
        });
    } catch (error: any) {
        debug('Error generating or playing audio response: ' + (error instanceof Error ? error.message : String(error)));
    }
}
