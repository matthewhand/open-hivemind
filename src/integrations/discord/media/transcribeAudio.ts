import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import fs from 'fs';
import Debug from 'debug';

const debug = Debug('app:transcribeAudio');
const openai = new OpenAI({
  apiKey: openaiConfig.get('OPENAI_API_KEY'),
});

/**
 * Transcribes audio using OpenAI's speech-to-text model.
 * 
 * @param {string} audioFilePath - The path to the audio file to transcribe.
 * @returns {Promise<string>} - The transcribed text.
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const model = openaiConfig.get('OPENAI_TRANSCRIBE_MODEL', 'whisper-1');
    const fileStream = fs.createReadStream(audioFilePath);

    const response = await openai.audio.transcriptions.create({
      model,
      file: fileStream,
    });

    if (!response.text) {
      throw new Error('Transcription failed.');
    }

    debug('Transcription completed:', response.text);
    return response.text;
  } catch (error) {
    debug('Error in transcription:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
