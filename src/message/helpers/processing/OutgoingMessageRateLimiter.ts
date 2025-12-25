import Debug from 'debug';

const debug = Debug('app:OutgoingMessageRateLimiter');

export class OutgoingMessageRateLimiter {
  private static instance: OutgoingMessageRateLimiter;
  private byChannel: Map<string, number[]> = new Map();

  public static getInstance(): OutgoingMessageRateLimiter {
    if (!OutgoingMessageRateLimiter.instance) {
      OutgoingMessageRateLimiter.instance = new OutgoingMessageRateLimiter();
    }
    return OutgoingMessageRateLimiter.instance;
  }

  public getBackoffMs(channelId: string, maxPerWindow: number, windowMs: number): number {
    const now = Date.now();
    const timestamps = this.byChannel.get(channelId) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);
    this.byChannel.set(channelId, valid);

    if (valid.length < maxPerWindow) {return 0;}

    const oldest = Math.min(...valid);
    const waitMs = windowMs - (now - oldest) + 250; // buffer
    const clamped = Math.max(250, waitMs);
    debug(`Backoff for ${channelId}: ${clamped}ms (count=${valid.length}/${maxPerWindow})`);
    return clamped;
  }

  public recordSend(channelId: string): void {
    const now = Date.now();
    const timestamps = this.byChannel.get(channelId) || [];
    timestamps.push(now);
    this.byChannel.set(channelId, timestamps);
  }

  public clear(channelId?: string): void {
    if (channelId) {
      this.byChannel.delete(channelId);
      return;
    }
    this.byChannel.clear();
  }
}

export default OutgoingMessageRateLimiter;

