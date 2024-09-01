import Debug from 'debug';
import OpenAI from 'openai';
import fs from 'fs';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:transcribeAudio');
const configManager = ConfigurationManager.getInstance();

/**
 * Transcribe Audio
 *
 * This function handles the transcription of audio files using the OpenAI API. It reads the audio file, sends it to the API,
 * and returns the transcribed text. The function also handles errors and logs detailed information for troubleshooting.
 *
 * @param {string} audioFilePath - The path to the audio file to be transcribed.
 * @returns {Promise<string>} The transcribed text.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const openaiConfig = configManager.getConfig('openaiConfig') as unknown as { OPENAI_API_KEY: string; OPENAI_MODEL?: string; OPENAI_VOICE?: string; OPENAI_TEMPERATURE?: number; };

        if (!openaiConfig || !openaiConfig.OPENAI_API_KEY) {
            throw new Error('OpenAI configuration is missing or incomplete.');
        }

        const openai = new OpenAI({
            apiKey: openaiConfig.OPENAI_API_KEY
        });
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: openaiConfig.OPENAI_MODEL || 'whisper-1',
            response_format: 'text'
        });
        debug('transcribeAudio: Full response: ' + JSON.stringify(response));
        return response.text;
    } catch (error: any) {
        debug('transcribeAudio: Error transcribing audio: ' + (error instanceof Error ? error.message : String(error)));
        if (error.response) {
            debug('transcribeAudio: Response status: ' + error.response.status);
            debug('transcribeAudio: Response data: ' + JSON.stringify(error.response.data));
        }
        throw error;
    }
}
