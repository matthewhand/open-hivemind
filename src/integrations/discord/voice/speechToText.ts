import OpenAI from 'openai';
import fs from 'fs';
import openaiConfig from '@config/openaiConfig';
import Debug from 'debug';

const debug = Debug('app:discord:stt');

export async function transcribeAudio(audioPath: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: openaiConfig.get('OPENAI_API_KEY')
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
    });

    debug(`Transcribed: ${transcription.text}`);
    return transcription.text;
  } catch (error: any) {
    debug(`STT error: ${error.message}`);
    throw error;
  }
}