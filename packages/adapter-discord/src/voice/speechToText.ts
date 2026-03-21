import fs from 'fs';
import Debug from 'debug';
import OpenAI from 'openai';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import openaiConfig from '@config/openaiConfig';

const debug = Debug('app:discord:stt');

export async function transcribeAudio(audioPath: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: openaiConfig.get('OPENAI_API_KEY') as string,
  });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
    });

    debug(`Transcribed: ${transcription.text}`);
    return transcription.text;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug(`STT error: ${ErrorUtils.getMessage(hivemindError)}`);

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord STT error:', hivemindError);
    }

    throw ErrorUtils.createError(
      `Speech-to-text failed: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'DISCORD_STT_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error }
    );
  }
}
