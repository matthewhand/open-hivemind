import { VoiceConnection, VoiceReceiver } from '@discordjs/voice';
import Debug from 'debug';

const debug = Debug('app:discord:vad');

export class VoiceActivityDetection {
  private receiver: VoiceReceiver;
  private activeUsers = new Set<string>();

  constructor(connection: VoiceConnection) {
    this.receiver = connection.receiver;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.receiver.speaking.on('start', (userId: string) => {
      this.activeUsers.add(userId);
      debug(`User ${userId} started speaking`);
    });

    this.receiver.speaking.on('end', (userId: string) => {
      this.activeUsers.delete(userId);
      debug(`User ${userId} stopped speaking`);
    });
  }

  public isUserSpeaking(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  public getActiveSpeakers(): string[] {
    return Array.from(this.activeUsers);
  }

  public onUserStartSpeaking(callback: (userId: string) => void): void {
    this.receiver.speaking.on('start', callback);
  }

  public onUserStopSpeaking(callback: (userId: string) => void): void {
    this.receiver.speaking.on('end', callback);
  }
}