import Debug from 'debug';
import OpenAI from 'openai';
import fs from 'fs';
import openaiConfig from '@integrations/openai/config/openaiConfig';

const debug = Debug('app:transcribeAudio');

/**
 * Transcribe Audio
 *
 * This function transcribes audio files using OpenAI's API. It sends the audio file for processing and retrieves
 * the transcription. The function logs all steps and handles any errors, including missing or incomplete configurations.
 *
 * Key Features:
 * - Sends audio files to OpenAI for transcription
 * - Handles errors and logs debug information
 * - Uses configurable API key and model
 *
 * @param {string} audioFilePath - The path to the audio file to be transcribed.
 * @returns {Promise<string>} - The transcribed text from OpenAI.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const apiKey = openaiConfig.get<string>('OPENAI_API_KEY');
        const model = openaiConfig.get<string>('OPENAI_MODEL') || 'whisper-1';

        if (!apiKey) {
            throw new Error('OpenAI API key is missing or incomplete.');
        }

        const openai = new OpenAI({ apiKey });
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model,
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
