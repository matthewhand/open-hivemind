import { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection } from '@discordjs/voice';
import axios from 'axios';
import fs from 'fs';
import util from 'util';
import constants from '@config/ConfigurationManager';
/**
 * Plays the audio response back in the voice channel.
 * @param {VoiceConnection} connection - The voice connection object.
 * @param {string} text - The text to convert to speech and play.
 * @returns {Promise<void>}
 */
export async function playAudioResponse(connection: VoiceConnection, text: string): Promise<void> {
    const narrationEndpointUrl = constants.NARRATION_ENDPOINT_URL;
    if (!narrationEndpointUrl) {
        debug('NARRATION_ENDPOINT_URL is not set in the environment variables.');
        return;
    }
    debug('NARRATION_ENDPOINT_URL: ' + narrationEndpointUrl);
    try {
        const response = await axios.post(narrationEndpointUrl, {
            input: text,
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' }
        }, {
            headers: {
                'Authorization': 'Bearer ' + constants.NARRATION_API_KEY,
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
