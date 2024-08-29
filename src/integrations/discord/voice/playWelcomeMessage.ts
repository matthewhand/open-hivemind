import ConfigurationManager from '@src/config/ConfigurationManager';
import Debug from 'debug';
import { VoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import OpenAI from 'openai';
import fs from 'fs';
import util from 'util';
import path from 'path';

const debug = Debug('app:playWelcomeMessage');
const configManager = ConfigurationManager.getInstance();

const defaultPath = './data/';
const audioFilePath = configManager.getConfig('discordConfig').WELCOME_AUDIO_PATH || defaultPath;

if (!fs.existsSync(audioFilePath)) {
    fs.mkdirSync(audioFilePath, { recursive: true });
}

export async function playWelcomeMessage(connection: VoiceConnection): Promise<void> {
    const discordConfig = configManager.getConfig('discordConfig');
    const openaiConfig = configManager.getConfig('openaiConfig');

    const welcomeMessage = discordConfig.DISCORD_WELCOME_MESSAGE;
    debug('Playing welcome message: ' + welcomeMessage);
    
    const openai = new OpenAI({
        apiKey: openaiConfig.OPENAI_API_KEY
    });

    const outputPath = path.join(audioFilePath, 'welcome.mp3');

    if (fs.existsSync(outputPath)) {
        debug(`File ${outputPath} already exists. Playing existing file.`);
    } else {
        try {
            const response = await openai.audio.speech.create({
                model: 'tts-1',
                voice: 'nova',
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
