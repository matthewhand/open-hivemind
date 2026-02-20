import type { VoiceConnection } from '@discordjs/voice';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { transcribeAudio } from './speechToText';
import { convertOpusToWav } from '../media/convertOpusToWav';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import OpenAI from 'openai';
import openaiConfig from '@config/openaiConfig';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:discord:voiceCommands');

export class VoiceCommandHandler {
  private connection: VoiceConnection;
  private isListening = false;

  constructor(connection: VoiceConnection) {
    this.connection = connection;
  }

  async processVoiceInput(opusBuffer: Buffer): Promise<void> {
    if (!this.isListening) { return; }

    try {
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) { fs.mkdirSync(tempDir, { recursive: true }); }

      const wavPath = await convertOpusToWav(opusBuffer, tempDir);
      const transcription = await transcribeAudio(wavPath);

      if (transcription.trim()) {
        const response = await this.generateResponse(transcription);
        await this.speakResponse(response);
      }

      fs.unlinkSync(wavPath);
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
    if (llmProviders.length === 0) { return 'I\'m having trouble processing that.'; }

    try {
      return await llmProviders[0].generateChatCompletion(text, [], {});
    } catch {
      return 'Sorry, I couldn\'t process that request.';
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
      fs.writeFileSync(tempPath, buffer);

      const player = createAudioPlayer();
      const resource = createAudioResource(tempPath);
      player.play(resource);
      this.connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          debug(`Failed to delete temporary file: ${ErrorUtils.getMessage(hivemindError)}`);
        }
      });

      // Also handle error cases
      player.on('error', () => {
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          debug(`Failed to delete temporary file on error: ${ErrorUtils.getMessage(hivemindError)}`);
        }
      });
    } catch (error: unknown) {
      // Clean up temp file if it was created
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (cleanupError: unknown) {
        const hivemindCleanupError = ErrorUtils.toHivemindError(cleanupError);
        debug(`Failed to delete temporary file during cleanup: ${ErrorUtils.getMessage(hivemindCleanupError)}`);
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