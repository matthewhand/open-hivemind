import Debug from 'debug';
import { VoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import OpenAI from 'openai';
import fs from 'fs';
import util from 'util';
import path from 'path';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import openaiConfig from '@integrations/openai/config/openaiConfig';

const debug = Debug('app:playWelcomeMessage');

const defaultDir = './data/';
const defaultFileName = 'welcome.mp3';

const audioDir = discordConfig.get<string>('DISCORD_AUDIO_FILE_PATH') || defaultDir;
const outputPath = path.join(audioDir, defaultFileName);

if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type AllowedVoice = typeof allowedVoices[number];

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

    const welcomeMessage = discordConfig.get<string>('DISCORD_WELCOME_MESSAGE') || 'Welcome to the server!';
    const model = openaiConfig.get<string>('OPENAI_MODEL') || 'text-davinci-003';
    let voice: AllowedVoice = 'fable';

    // Use OPENAI_VOICE if it exists and is valid
    if (openaiConfig.get<string>('OPENAI_VOICE') && isAllowedVoice(openaiConfig.get<string>('OPENAI_VOICE'))) {
        voice = openaiConfig.get<string>('OPENAI_VOICE');
    }

    debug('Playing welcome message: ' + welcomeMessage);

    const openai = new OpenAI({
        apiKey: openaiConfig.get<string>('OPENAI_API_KEY') || ''
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
        });
    } catch (error: any) {
        debug('Error playing audio file: ' + error.message);
    }
}
