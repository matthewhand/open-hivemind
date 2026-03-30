import Debug from 'debug';

const debug = Debug('app:discord:voiceManager');

/**
 * Stub: VoiceChannelManager
 * The original voice module sources were removed. This stub exists so that
 * DiscordService.ts can still `require('./voice/voiceChannelManager')` without
 * crashing at import time.  All methods are no-ops.
 */
export class VoiceChannelManager {
  private client: any;
  private connections = new Map<string, any>();

  constructor(client: any) {
    this.client = client;
    debug('VoiceChannelManager stub initialized');
  }

  async joinChannel(channelId: string, _autoListen = true): Promise<any> {
    debug(`joinChannel stub called for ${channelId}`);
    return null;
  }

  async leaveChannel(channelId: string): Promise<void> {
    this.connections.delete(channelId);
    debug(`leaveChannel stub called for ${channelId}`);
  }

  isConnected(channelId: string): boolean {
    return this.connections.has(channelId);
  }

  getConnectedChannels(): string[] {
    return Array.from(this.connections.keys());
  }

  async disconnectAll(): Promise<void> {
    this.connections.clear();
    debug('disconnectAll stub called');
  }
}
