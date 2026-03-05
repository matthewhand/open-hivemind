import Debug from 'debug';

const debug = Debug('app:OutgoingMessageRateLimiter');

export class OutgoingMessageRateLimiter {
  private static instance: OutgoingMessageRateLimiter;
  private byChannel = new Map<string, number[]>();

  // Bounded cache configuration
  private readonly MAX_CHANNELS = parseInt(
    process.env.OUTGOING_RATE_LIMITER_MAX_CHANNELS || '5000',
    10
  );
  private readonly MAX_TIMESTAMPS_PER_CHANNEL = parseInt(
    process.env.OUTGOING_RATE_LIMITER_MAX_TIMESTAMPS || '100',
    10
  );

  public static getInstance(): OutgoingMessageRateLimiter {
    if (!OutgoingMessageRateLimiter.instance) {
      OutgoingMessageRateLimiter.instance = new OutgoingMessageRateLimiter();
    }
    return OutgoingMessageRateLimiter.instance;
  }

  /**
   * Enforce max channels limit by removing oldest entries.
   * Called when the Map size exceeds the limit.
   */
  private enforceMaxChannels(): void {
    if (this.byChannel.size < this.MAX_CHANNELS) {
      return;
    }

    // Find channels with oldest last timestamp
    const entries = Array.from(this.byChannel.entries())
      .map(([key, timestamps]) => ({
        key,
        lastTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      }))
      .sort((a, b) => a.lastTimestamp - b.lastTimestamp);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(this.MAX_CHANNELS * 0.1);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.byChannel.delete(entries[i].key);
    }
    debug(`Enforced max channels limit, removed ${toRemove} oldest channels`);
  }

  /**
   * Prune old timestamps for a specific channel and enforce max timestamps limit.
   */
  private pruneTimestamps(channelId: string, windowMs: number): number[] {
    const timestamps = this.byChannel.get(channelId);
    if (!timestamps) {
      return [];
    }

    const now = Date.now();
    // Remove old timestamps outside the window
    const valid = timestamps.filter((t) => now - t < windowMs);
    // Also enforce max timestamps per channel to prevent unbounded array growth
    const limited = valid.slice(-this.MAX_TIMESTAMPS_PER_CHANNEL);
    this.byChannel.set(channelId, limited);
    return limited;
  }

  public getBackoffMs(channelId: string, maxPerWindow: number, windowMs: number): number {
    const now = Date.now();
    const valid = this.pruneTimestamps(channelId, windowMs);

    if (valid.length < maxPerWindow) {
      return 0;
    }

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
    // Limit the array size to prevent unbounded growth
    const limited = timestamps.slice(-this.MAX_TIMESTAMPS_PER_CHANNEL);
    this.byChannel.set(channelId, limited);

    // Enforce max channels limit
    this.enforceMaxChannels();
  }

  public clear(channelId?: string): void {
    if (channelId) {
      this.byChannel.delete(channelId);
      return;
    }
    this.byChannel.clear();
  }

  /**
   * Get statistics about the rate limiter state.
   */
  public getStats(): {
    channelsCount: number;
    maxChannels: number;
    totalTimestamps: number;
  } {
    let totalTimestamps = 0;
    for (const timestamps of this.byChannel.values()) {
      totalTimestamps += timestamps.length;
    }
    return {
      channelsCount: this.byChannel.size,
      maxChannels: this.MAX_CHANNELS,
      totalTimestamps,
    };
  }
}

export default OutgoingMessageRateLimiter;
