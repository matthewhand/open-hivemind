import { VoiceConnection, EndBehaviorType } from '@discordjs/voice';
import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('app:discord:recorder');

export class AudioRecorder {
  private connection: VoiceConnection;
  private recordings = new Map<string, Buffer[]>();
  private isRecording = false;

  constructor(connection: VoiceConnection) {
    this.connection = connection;
  }

  startRecording(userId?: string): void {
    if (this.isRecording) return;
    
    this.isRecording = true;
    debug('Started recording audio');

    if (userId) {
      this.recordUser(userId);
    } else {
      this.recordAllUsers();
    }
  }

  stopRecording(): Map<string, Buffer> {
    this.isRecording = false;
    debug('Stopped recording audio');

    const results = new Map<string, Buffer>();
    for (const [userId, chunks] of this.recordings) {
      results.set(userId, Buffer.concat(chunks));
    }

    this.recordings.clear();
    return results;
  }

  private recordUser(userId: string): void {
    const receiver = this.connection.receiver;
    const subscription = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    if (!this.recordings.has(userId)) {
      this.recordings.set(userId, []);
    }

    subscription.on('data', (chunk: Buffer) => {
      if (this.isRecording) {
        this.recordings.get(userId)!.push(chunk);
      }
    });

    subscription.on('end', () => {
      debug(`Recording ended for user ${userId}`);
    });
  }

  private recordAllUsers(): void {
    const receiver = this.connection.receiver;
    
    receiver.speaking.on('start', (userId: string) => {
      if (this.isRecording && !this.recordings.has(userId)) {
        this.recordUser(userId);
      }
    });
  }

  async saveRecording(userId: string, outputPath: string): Promise<string> {
    const chunks = this.recordings.get(userId);
    if (!chunks || chunks.length === 0) {
      throw new Error(`No recording found for user ${userId}`);
    }

    const buffer = Buffer.concat(chunks);
    const filePath = path.join(outputPath, `recording_${userId}_${Date.now()}.pcm`);
    
    await fs.promises.writeFile(filePath, buffer);
    debug(`Saved recording to ${filePath}`);
    
    return filePath;
  }

  getRecordingDuration(userId: string): number {
    const chunks = this.recordings.get(userId);
    if (!chunks) return 0;
    
    // Approximate duration based on chunk count (48kHz, 16-bit, mono)
    const totalSamples = chunks.length * 960; // 960 samples per chunk at 48kHz
    return totalSamples / 48000; // Convert to seconds
  }
}