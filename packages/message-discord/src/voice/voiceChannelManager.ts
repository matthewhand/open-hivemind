import Debug from 'debug';

const debug = Debug('app:discord:voiceManager');

/**
 * Unsupported: VoiceChannelManager
 *
 * The original Discord voice module sources were removed. This class remains only
 * so legacy imports do not crash at load time. **All methods are no-ops** and
 * DiscordService public voice APIs throw rather than reporting fake success.
 *
 * Do not wire this into product features or UI until a real @discordjs/voice
 * join path is restored. Whisper STT (`speechToText.ts`) is a library helper
 * only and is not reachable without a working join.
 */
export class VoiceChannelManager {
  private client: any;
  private connections = new Map<string, any>();

  constructor(client: any) {
    this.client = client;
    debug('VoiceChannelManager unsupported stub initialized (no real voice join)');
  }

  async joinChannel(channelId: string, _autoListen = true): Promise<any> {
    debug(`joinChannel no-op for ${channelId} — voice join is unsupported`);
    return null;
  }

  async leaveChannel(channelId: string): Promise<void> {
    this.connections.delete(channelId);
    debug(`leaveChannel no-op for ${channelId} — voice leave is unsupported`);
  }

  isConnected(channelId: string): boolean {
    return this.connections.has(channelId);
  }

  getConnectedChannels(): string[] {
    return Array.from(this.connections.keys());
  }

  async disconnectAll(): Promise<void> {
    this.connections.clear();
    debug('disconnectAll no-op — voice is unsupported');
  }
}
