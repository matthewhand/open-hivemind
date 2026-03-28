import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import OpenAI from 'openai';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  type VoiceConnection,
} from '@discordjs/voice';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import openaiConfig from '@config/openaiConfig';
import { convertOpusToWav } from '../media/convertOpusToWav';
import { transcribeAudio } from './speechToText';

const debug = Debug('app:discord:voiceCommands');

export class VoiceCommandHandler {
  private connection: VoiceConnection;
  private isListening = false;

  constructor(connection: VoiceConnection) {
    this.connection = connection;
  }

  async processVoiceInput(opusBuffer: Buffer): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      const tempDir = './temp';
      await fs.promises.mkdir(tempDir, { recursive: true });

      const wavPath = await convertOpusToWav(opusBuffer, tempDir);
      const transcription = await transcribeAudio(wavPath);

      if (transcription.trim()) {
        const response = await this.generateResponse(transcription);
        await this.speakResponse(response);
      }

      await fs.promises.unlink(wavPath);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const classification = ErrorUtils.classifyError(hivemindError);

      debug(`Voice processing error: ${ErrorUtils.getMessage(hivemindError)}`);

      // Log with appropriate level
      if (classification.logLevel === 'error') {
        console.error('Discord voice processing error:', hivemindError);
      }
    }
  }

  private async generateResponse(text: string): Promise<string> {
    const llmProviders = await getLlmProvider();
    if (llmProviders.length === 0) {
      return "I'm having trouble processing that.";
    }

    try {
      return await llmProviders[0].generateChatCompletion(text, [], {});
    } catch {
      return "Sorry, I couldn't process that request.";
    }
  }

  private async speakResponse(text: string): Promise<void> {
    const openai = new OpenAI({
      apiKey: openaiConfig.get('OPENAI_API_KEY') as string,
    });

    const tempPath = path.join('./temp', `response_${Date.now()}.mp3`);

    try {
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(tempPath, buffer);

      const player = createAudioPlayer();
      const resource = createAudioResource(tempPath);
      player.play(resource);
      this.connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, async () => {
        try {
          await fs.promises.access(tempPath, fs.constants.F_OK);
          await fs.promises.unlink(tempPath);
        } catch (error: unknown) {
          // If file doesn't exist or can't be deleted, we log but don't throw
          const hivemindError = ErrorUtils.toHivemindError(error);
          if ((error as any).code !== 'ENOENT') {
            debug(`Failed to delete temporary file: ${ErrorUtils.getMessage(hivemindError)}`);
          }
        }
      });

      // Also handle error cases
      player.on('error', async () => {
        try {
          await fs.promises.access(tempPath, fs.constants.F_OK);
          await fs.promises.unlink(tempPath);
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          if ((error as any).code !== 'ENOENT') {
            debug(
              `Failed to delete temporary file on error: ${ErrorUtils.getMessage(hivemindError)}`
            );
          }
        }
      });
    } catch (error: unknown) {
      // Clean up temp file if it was created
      try {
        await fs.promises.access(tempPath, fs.constants.F_OK);
        await fs.promises.unlink(tempPath);
      } catch (cleanupError: unknown) {
        const hivemindCleanupError = ErrorUtils.toHivemindError(cleanupError);
        debug(
          `Failed to delete temporary file during cleanup: ${ErrorUtils.getMessage(hivemindCleanupError)}`
        );
      }

      const hivemindError = ErrorUtils.toHivemindError(error);
      const classification = ErrorUtils.classifyError(hivemindError);

      debug(`TTS error: ${ErrorUtils.getMessage(hivemindError)}`);

      // Log with appropriate level
      if (classification.logLevel === 'error') {
        console.error('Discord TTS error:', hivemindError);
      }
    }
  }

  startListening(): void {
    this.isListening = true;
    debug('Voice command listening started');
  }

  stopListening(): void {
    this.isListening = false;
    debug('Voice command listening stopped');
  }
}
