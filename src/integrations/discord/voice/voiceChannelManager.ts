import { VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { Client } from 'discord.js';
import { connectToVoiceChannel } from '../interaction/connectToVoiceChannel';
import { VoiceCommandHandler } from './voiceCommandHandler';
import { VoiceActivityDetection } from './voiceActivityDetection';
import Debug from 'debug';

const debug = Debug('app:discord:voiceManager');

export class VoiceChannelManager {
  private connections = new Map<string, VoiceConnection>();
  private handlers = new Map<string, VoiceCommandHandler>();
  private vadSystems = new Map<string, VoiceActivityDetection>();
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async joinChannel(channelId: string, autoListen = true): Promise<VoiceConnection> {
    if (this.connections.has(channelId)) {
      return this.connections.get(channelId)!;
    }

    const connection = await connectToVoiceChannel(this.client, channelId);
    this.connections.set(channelId, connection);

    if (autoListen) {
      const handler = new VoiceCommandHandler(connection);
      const vad = new VoiceActivityDetection(connection);
      
      this.handlers.set(channelId, handler);
      this.vadSystems.set(channelId, vad);
      
      handler.startListening();
      debug(`Joined channel ${channelId} with voice command listening enabled`);
    }

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.cleanup(channelId);
    });

    return connection;
  }

  leaveChannel(channelId: string): void {
    const connection = this.connections.get(channelId);
    if (connection) {
      connection.destroy();
      this.cleanup(channelId);
      debug(`Left channel ${channelId}`);
    }
  }

  leaveAllChannels(): void {
    for (const channelId of this.connections.keys()) {
      this.leaveChannel(channelId);
    }
  }

  private cleanup(channelId: string): void {
    this.connections.delete(channelId);
    this.handlers.delete(channelId);
    this.vadSystems.delete(channelId);
  }

  getConnection(channelId: string): VoiceConnection | undefined {
    return this.connections.get(channelId);
  }

  getHandler(channelId: string): VoiceCommandHandler | undefined {
    return this.handlers.get(channelId);
  }

  getVAD(channelId: string): VoiceActivityDetection | undefined {
    return this.vadSystems.get(channelId);
  }

  getActiveChannels(): string[] {
    return Array.from(this.connections.keys());
  }
}