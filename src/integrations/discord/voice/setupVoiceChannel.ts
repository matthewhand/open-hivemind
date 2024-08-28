import { VoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import OpenAI from 'openai';
import fs from 'fs';
import util from 'util';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:setupVoiceChannel');

/**
 * Sets up the voice channel with a welcome message.
 * 
 * @param connection - The voice connection to use.
 * @returns A promise that resolves when the setup is complete.
 */
export async function setupVoiceChannel(connection: VoiceConnection): Promise<void> {
    const welcomeMessage = ConfigurationManager.DISCORD_WELCOME_MESSAGE;
    debug('Playing welcome message: ' + welcomeMessage);
    const openai = new OpenAI({
        apiKey: ConfigurationManager.OPENAI_API_KEY
    });
    try {
        // Generate speech using OpenAI's text-to-speech API
        const response = await openai.audio.speech.create({
            model: ConfigurationManager.OPENAI_MODEL,
            voice: 'nova',
            input: welcomeMessage,
        });
        // Get the audio data as a buffer
        const buffer = Buffer.from(await response.arrayBuffer());
        // Write the buffer to a file
        const writeFile = util.promisify(fs.writeFile);
        await writeFile('welcome.mp3', buffer);
        // Play the audio file
        const player = createAudioPlayer();
        const resource = createAudioResource('welcome.mp3');
        player.play(resource);
        connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => {
            fs.unlinkSync('welcome.mp3');
        });
        player.on('error', (error) => {
            debug('Error playing welcome message: ' + error.message);
        });
    } catch (error: any) {
        debug('Error generating welcome message: ' + error.message);
        if (error.response) {
            debug('Response status: ' + error.response.status);
            debug('Response data: ' + JSON.stringify(error.response.data));
        }
    }
}
