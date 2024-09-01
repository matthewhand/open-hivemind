import ConfigurationManager from '@src/config/ConfigurationManager';
import Debug from 'debug';
import { VoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import OpenAI from 'openai';
import fs from 'fs';
import util from 'util';
import path from 'path';

const debug = Debug('app:playWelcomeMessage');
const configManager = ConfigurationManager.getInstance();

const defaultDir = './data/';
const defaultFileName = 'welcome.mp3';

// Define explicit types for discordConfig and openaiConfig
interface DiscordConfig {
    WELCOME_AUDIO_DIR?: string;
    WELCOME_AUDIO_FILENAME?: string;
    DISCORD_WELCOME_MESSAGE?: string;
}

interface OpenAiConfig {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    OPENAI_VOICE?: string;
}

const discordConfig = configManager.getConfig('discordConfig') as DiscordConfig;
const openaiConfig = configManager.getConfig('openaiConfig') as OpenAiConfig;

const audioDir = discordConfig.WELCOME_AUDIO_DIR || defaultDir;
const audioFileName = discordConfig.WELCOME_AUDIO_FILENAME || defaultFileName;
const outputPath = path.join(audioDir, audioFileName);

if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}

const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type AllowedVoice = typeof allowedVoices[number];

function isAllowedVoice(voice: string): voice is AllowedVoice {
    return allowedVoices.includes(voice as AllowedVoice);
}

export async function playWelcomeMessage(connection: VoiceConnection): Promise<void> {
    if (!discordConfig || !openaiConfig) {
        debug('Configuration is not properly loaded.');
        return;
    }

    const welcomeMessage = discordConfig.DISCORD_WELCOME_MESSAGE || 'Welcome to the server!';
    const model = openaiConfig.OPENAI_MODEL || 'text-davinci-003';
    let voice: AllowedVoice = 'fable'; // Updated default voice

    if (openaiConfig.OPENAI_VOICE && isAllowedVoice(openaiConfig.OPENAI_VOICE)) {
        voice = openaiConfig.OPENAI_VOICE;
    }

    debug('Playing welcome message: ' + welcomeMessage);

    const openai = new OpenAI({
        apiKey: openaiConfig.OPENAI_API_KEY || ''
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
