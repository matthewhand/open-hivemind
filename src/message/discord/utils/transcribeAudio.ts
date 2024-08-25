import OpenAI from 'openai';
import fs from 'fs';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';

/**
 * Transcribes audio using the OpenAI API.
 * @param {string} audioFilePath - The path to the audio file to be transcribed.
 * @returns {Promise<string>} The transcribed text.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const openai = new OpenAI({
            apiKey: constants.TRANSCRIBE_API_KEY
        });

        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: 'whisper-1',
            response_format: 'text'
        });

        logger.debug('transcribeAudio: Full response:', response);
        return response.text;
    } catch (error: any) {
        logger.error('transcribeAudio: Error transcribing audio: ' + (error instanceof Error ? error.message : String(error)));
        if (error.response) {
            logger.debug('transcribeAudio: Response status: ' + error.response.status);
            logger.debug('transcribeAudio: Response data: ' + JSON.stringify(error.response.data));
        }
        throw error;
    }
}
