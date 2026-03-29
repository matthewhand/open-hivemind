import Debug from 'debug';
import fs from 'fs';
import { convertOpusToWav } from '../media/convertOpusToWav';
import { transcribeAudio } from './speechToText';

const debug = Debug('app:discord:voiceCommandHandler');

const TEMP_DIR = './temp';

/**
 * Handles voice commands from Discord voice channels.
 */
export class VoiceCommandHandler {
  private connection: any;
  private isListening = false;

  constructor(connection: any) {
    this.connection = connection;
    debug('VoiceCommandHandler initialized');
  }

  startListening(): void {
    this.isListening = true;
    debug('Started listening for voice commands');
  }

  stopListening(): void {
    this.isListening = false;
    debug('Stopped listening for voice commands');
  }

  async processVoiceInput(audioBuffer: Buffer): Promise<string> {
    if (!this.isListening) {
      return '';
    }

    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    try {
      const wavPath = await convertOpusToWav(audioBuffer, TEMP_DIR);
      const transcription = await transcribeAudio(wavPath);

      if (!transcription || transcription.trim().length === 0) {
        return '';
      }

      debug('Transcribed voice input: %s', transcription);
      return transcription;
    } catch (error) {
      debug('Error processing voice input: %O', error);
      return '';
    }
  }
}
