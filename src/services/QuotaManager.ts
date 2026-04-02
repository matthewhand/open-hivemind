import Debug from 'debug';
import type { QuotaStore } from './QuotaStore';

const debug = Debug('app:QuotaManager');

// ─── Public Types ────────────────────────────────────────────────────────────

export interface QuotaConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxTokensPerDay: number;
}

export interface QuotaStatus {
  allowed: boolean;
  used: { minute: number; hour: number; day: number; tokens: number };
  remaining: { minute: number; hour: number; day: number; tokens: number };
  resetAt: { minute: Date; hour: Date; day: Date };
}

export type EntityType = 'user' | 'bot' | 'channel';

// ─── Constants ───────────────────────────────────────────────────────────────

const TTL_MINUTE = 60;
const TTL_HOUR = 3600;
const TTL_DAY = 86400;

const DEFAULT_QUOTA: QuotaConfig = {
  maxRequestsPerMinute: parseInt(process.env.QUOTA_MAX_REQ_PER_MINUTE || '20', 10),
  maxRequestsPerHour: parseInt(process.env.QUOTA_MAX_REQ_PER_HOUR || '200', 10),
  maxRequestsPerDay: parseInt(process.env.QUOTA_MAX_REQ_PER_DAY || '2000', 10),
  maxTokensPerDay: parseInt(process.env.QUOTA_MAX_TOKENS_PER_DAY || '500000', 10),
};

// ─── Time-window helpers ─────────────────────────────────────────────────────

/** Return the start-of-window epoch for a given granularity. */
function windowKey(granularity: 'minute' | 'hour' | 'day'): string {
  const now = new Date();
  switch (granularity) {
    case 'minute':
      return `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
    case 'hour':
      return `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}`;
    case 'day':
      return `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}`;
  }
}

function nextResetDate(granularity: 'minute' | 'hour' | 'day'): Date {
  const now = new Date();
  switch (granularity) {
    case 'minute': {
      const d = new Date(now);
      d.setUTCSeconds(0, 0);
      d.setUTCMinutes(d.getUTCMinutes() + 1);
      return d;
    }
    case 'hour': {
      const d = new Date(now);
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() + 1);
      return d;
    }
    case 'day': {
      const d = new Date(now);
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    }
  }
}

// ─── QuotaManager ────────────────────────────────────────────────────────────

export class QuotaManager {
  private store: QuotaStore;
  private configs = new Map<string, QuotaConfig>();

  constructor(store: QuotaStore) {
    this.store = store;
  }

  // ── Config helpers ───────────────────────────────────────────────────────

  getQuotaConfig(entityId: string): QuotaConfig {
    return this.configs.get(entityId) ?? { ...DEFAULT_QUOTA };
  }

  setQuotaConfig(entityId: string, config: Partial<QuotaConfig>): void {
    const current = this.getQuotaConfig(entityId);
    this.configs.set(entityId, { ...current, ...config });
  }

  // ── Core operations ──────────────────────────────────────────────────────

  /**
   * Check the current quota status for a given entity without consuming any quota.
   */
  async checkQuota(entityId: string, entityType: EntityType): Promise<QuotaStatus> {
    const config = this.getQuotaConfig(entityId);
    const prefix = `${entityType}:${entityId}`;

    const [minuteUsed, hourUsed, dayUsed, tokensUsed] = await Promise.all([
      this.store.get(`${prefix}:req:${windowKey('minute')}`),
      this.store.get(`${prefix}:req:${windowKey('hour')}`),
      this.store.get(`${prefix}:req:${windowKey('day')}`),
      this.store.get(`${prefix}:tok:${windowKey('day')}`),
    ]);

    const status: QuotaStatus = {
      allowed:
        minuteUsed < config.maxRequestsPerMinute &&
        hourUsed < config.maxRequestsPerHour &&
        dayUsed < config.maxRequestsPerDay &&
        tokensUsed < config.maxTokensPerDay,
      used: {
        minute: minuteUsed,
        hour: hourUsed,
        day: dayUsed,
        tokens: tokensUsed,
      },
      remaining: {
        minute: Math.max(0, config.maxRequestsPerMinute - minuteUsed),
        hour: Math.max(0, config.maxRequestsPerHour - hourUsed),
        day: Math.max(0, config.maxRequestsPerDay - dayUsed),
        tokens: Math.max(0, config.maxTokensPerDay - tokensUsed),
      },
      resetAt: {
        minute: nextResetDate('minute'),
        hour: nextResetDate('hour'),
        day: nextResetDate('day'),
      },
    };

    debug(
      `Quota check for ${entityType}:${entityId} — allowed=${status.allowed} ` +
        `min=${minuteUsed}/${config.maxRequestsPerMinute} ` +
        `hr=${hourUsed}/${config.maxRequestsPerHour} ` +
        `day=${dayUsed}/${config.maxRequestsPerDay} ` +
        `tok=${tokensUsed}/${config.maxTokensPerDay}`
    );

    return status;
  }

  /**
   * Consume request quota (1 request against minute/hour/day counters).
   * Optionally also consume a token amount.
   */
  async consumeQuota(entityId: string, entityType: EntityType, amount: number = 1): Promise<void> {
    const prefix = `${entityType}:${entityId}`;

    await Promise.all([
      this.store.increment(`${prefix}:req:${windowKey('minute')}`, TTL_MINUTE, amount),
      this.store.increment(`${prefix}:req:${windowKey('hour')}`, TTL_HOUR, amount),
      this.store.increment(`${prefix}:req:${windowKey('day')}`, TTL_DAY, amount),
    ]);

    debug(`Consumed ${amount} request(s) for ${entityType}:${entityId}`);
  }

  /**
   * Consume token quota separately (called after inference completes).
   */
  async consumeTokens(entityId: string, entityType: EntityType, tokens: number): Promise<void> {
    const prefix = `${entityType}:${entityId}`;
    await this.store.increment(`${prefix}:tok:${windowKey('day')}`, TTL_DAY, tokens);
    debug(`Consumed ${tokens} token(s) for ${entityType}:${entityId}`);
  }

  /**
   * Reset all quota counters for an entity by deleting known keys.
   */
  async resetQuota(entityId: string, entityType: EntityType = 'user'): Promise<void> {
    const prefix = `${entityType}:${entityId}`;
    const windows: Array<'minute' | 'hour' | 'day'> = ['minute', 'hour', 'day'];

    const keys: string[] = [];
    for (const w of windows) {
      keys.push(`${prefix}:req:${windowKey(w)}`);
    }
    keys.push(`${prefix}:tok:${windowKey('day')}`);

    await Promise.all(keys.map((k) => this.store.delete(k)));
    debug(`Reset quota for ${entityType}:${entityId}`);
  }

  /**
   * Compute the smallest Retry-After value (seconds) among exceeded windows.
   */
  retryAfterSeconds(status: QuotaStatus): number {
    const now = Date.now();
    let earliest = Infinity;
    if (status.remaining.minute === 0) {
      earliest = Math.min(earliest, status.resetAt.minute.getTime() - now);
    }
    if (status.remaining.hour === 0) {
      earliest = Math.min(earliest, status.resetAt.hour.getTime() - now);
    }
    if (status.remaining.day === 0) {
      earliest = Math.min(earliest, status.resetAt.day.getTime() - now);
    }
    return Math.max(1, Math.ceil(earliest / 1000));
  }
}
