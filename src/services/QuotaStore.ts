import Debug from 'debug';

const debug = Debug('app:QuotaStore');

/**
 * Interface for quota storage backends.
 * Each key represents a counter (e.g. "user:123:minute") with a TTL in seconds.
 */
export interface QuotaStore {
  /**
   * Increment a counter by the given amount and set/refresh its TTL.
   * Returns the new value after incrementing.
   */
  increment(key: string, ttlSeconds: number, amount?: number): Promise<number>;

  /**
   * Get the current value for a counter. Returns 0 if the key does not exist.
   */
  get(key: string): Promise<number>;

  /**
   * Delete a counter.
   */
  delete(key: string): Promise<void>;

  /**
   * Shut down the store and release resources.
   */
  shutdown(): void;
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

interface MemoryEntry {
  value: number;
  expiresAt: number; // epoch ms
}

export class InMemoryQuotaStore implements QuotaStore {
  private data = new Map<string, MemoryEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs = 60_000) {
    this.cleanupTimer = setInterval(() => this.evictExpired(), cleanupIntervalMs);
    // Allow the process to exit even if the timer is still alive.
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
    debug('InMemoryQuotaStore cleanup timer started');
  }

  async increment(key: string, ttlSeconds: number, amount = 1): Promise<number> {
    const now = Date.now();
    const entry = this.data.get(key);

    if (!entry || now >= entry.expiresAt) {
      // Key expired or missing — start fresh
      const newEntry: MemoryEntry = { value: amount, expiresAt: now + ttlSeconds * 1000 };
      this.data.set(key, newEntry);
      return amount;
    }

    entry.value += amount;
    return entry.value;
  }

  async get(key: string): Promise<number> {
    const entry = this.data.get(key);
    if (!entry || Date.now() >= entry.expiresAt) {
      return 0;
    }
    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      debug('InMemoryQuotaStore cleanup timer stopped');
    }
    this.data.clear();
  }

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.data.entries()) {
      if (now >= entry.expiresAt) {
        this.data.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      debug(`Evicted ${evicted} expired quota entries`);
    }
  }
}

// ─── Redis Implementation ────────────────────────────────────────────────────

/**
 * Redis-backed quota store.  Uses INCRBY + EXPIRE so counters automatically
 * disappear after the TTL window elapses.
 *
 * The constructor accepts any object that exposes `sendCommand(args: string[]): Promise<any>`,
 * which matches the interface already used by the existing rateLimiter Redis client.
 */
export class RedisQuotaStore implements QuotaStore {
  private prefix: string;
  private redis: { sendCommand(args: string[]): Promise<any> };

  constructor(redis: { sendCommand(args: string[]): Promise<any> }, prefix = 'quota') {
    this.redis = redis;
    this.prefix = prefix;
  }

  private key(raw: string): string {
    return `${this.prefix}:${raw}`;
  }

  async increment(key: string, ttlSeconds: number, amount = 1): Promise<number> {
    const k = this.key(key);
    const newVal = await this.redis.sendCommand(['INCRBY', k, String(amount)]);
    // Set expiry only when the counter is freshly created (value equals amount).
    // This avoids resetting the TTL on every increment.
    if (Number(newVal) === amount) {
      await this.redis.sendCommand(['EXPIRE', k, String(ttlSeconds)]);
    }
    return Number(newVal);
  }

  async get(key: string): Promise<number> {
    const val = await this.redis.sendCommand(['GET', this.key(key)]);
    return val ? Number(val) : 0;
  }

  async delete(key: string): Promise<void> {
    await this.redis.sendCommand(['DEL', this.key(key)]);
  }

  shutdown(): void {
    // Redis connection lifecycle is managed externally.
    debug('RedisQuotaStore shutdown (no-op — connection managed externally)');
  }
}
