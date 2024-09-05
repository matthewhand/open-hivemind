import Debug from 'debug';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import axios from 'axios';
import fs from 'fs';

const debug = Debug('app:transcribeAudio');

/**
 * Transcribes audio using OpenAI's speech-to-text model.
 * 
 * @param {string} audioFilePath - The path to the audio file to transcribe.
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const model = openaiConfig.get('OPENAI_TRANSCRIBE_MODEL') || 'whisper-1'; // Fix: Correct model access
        const apiKey = openaiConfig.get('OPENAI_API_KEY');

        if (!apiKey) {
            throw new Error('API key for OpenAI is missing.'); // Guard for API key
        }

        debug('Sending audio for transcription...', { model, audioFilePath }); // Logging model and path

        const audioBuffer = fs.readFileSync(audioFilePath); // Fix: Correct file reading
        const response = await axios.post(
            openaiConfig.get('OPENAI_BASE_URL') + '/v1/audio/transcriptions',
            { model, file: audioBuffer },
            {
                headers: {
                    'Authorization': 'Bearer ' + apiKey,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response || !response.data || !response.data.text) {
            throw new Error('Failed to transcribe audio.');
        }

        return response.data.text;
    } catch (error: any) {
        debug('Error transcribing audio:', error.message);
        throw error;
    }
}
