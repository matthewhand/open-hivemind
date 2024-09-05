import Debug from 'debug';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';

const debug = Debug('app:transcribeAudio');

/**
 * Transcribes audio using OpenAI's speech-to-text model.
 * 
 * This function sends audio input to OpenAI's API and transcribes it into text.
 * It handles errors and logs key values for debugging purposes.
 * 
 * @param {Buffer} audioBuffer - The audio file as a buffer.
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
        const model = openaiConfig.get('OPENAI_TRANSCRIBE_MODEL') || 'whisper-1';
        const apiKey = openaiConfig.get('OPENAI_API_KEY');

        if (!apiKey) {
            throw new Error('API key for OpenAI is missing.');
        }

        debug('Sending audio for transcription...');

        // Mock of the actual transcription process
        const response = await convertOpusToWav({
            model,
            apiKey,
            audioBuffer
        });

        if (!response) {
            throw new Error('Failed to transcribe audio.');
        }

        return response.text;
    } catch (error: any) {
        debug('Error transcribing audio: ' + error.message);
        throw error;
    }
}
