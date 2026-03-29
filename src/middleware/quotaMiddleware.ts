import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { QuotaManager, type EntityType, type QuotaStatus } from '../services/QuotaManager';
import { InMemoryQuotaStore, type QuotaStore } from '../services/QuotaStore';

const debug = Debug('app:quotaMiddleware');

// ─── Singleton QuotaManager wired to the appropriate store ───────────────────

let _quotaManager: QuotaManager | null = null;
let _quotaStore: QuotaStore | null = null;

/**
 * Lazily initialise the QuotaManager.
 * In production with REDIS_URL set we attempt to use Redis; otherwise we fall
 * back to the in-memory store.
 */
export function getQuotaManager(): QuotaManager {
  if (_quotaManager) {
    return _quotaManager;
  }

  const redisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && redisUrl) {
    try {
      // Dynamic require so the redis dependency stays optional.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const redis = require('redis');
      const client = redis.createClient({ url: redisUrl });
      client.connect().catch((err: Error) => {
        debug('Redis connect failed for quota store, falling back to memory:', err.message);
      });

      // Import RedisQuotaStore lazily to avoid top-level side-effects
      const { RedisQuotaStore } = require('../services/QuotaStore');
      _quotaStore = new RedisQuotaStore(client, 'quota');
      debug('QuotaManager initialised with Redis store');
    } catch {
      debug('Redis unavailable for quota store, using in-memory fallback');
      _quotaStore = new InMemoryQuotaStore();
    }
  } else {
    _quotaStore = new InMemoryQuotaStore();
    debug('QuotaManager initialised with in-memory store');
  }

  _quotaManager = new QuotaManager(_quotaStore);
  return _quotaManager;
}

/**
 * Allow tests and application code to inject a custom QuotaManager.
 */
export function setQuotaManager(manager: QuotaManager): void {
  _quotaManager = manager;
}

// ─── Identity extraction helpers ─────────────────────────────────────────────

interface IdentityResult {
  entityId: string;
  entityType: EntityType;
}

/**
 * Extract user/bot identity from the incoming request.
 * Tries (in order):
 *   1. `req.user.id` (authenticated user)
 *   2. `x-bot-id` header (bot-to-bot requests)
 *   3. IP address fallback
 */
function extractIdentity(req: Request): IdentityResult {
  // Authenticated user
  const user = (req as any).user;
  if (user?.id) {
    return { entityId: String(user.id), entityType: 'user' };
  }

  // Bot identity via header
  const botId = req.headers['x-bot-id'];
  if (botId && typeof botId === 'string') {
    return { entityId: botId, entityType: 'bot' };
  }

  // Fallback to IP
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return { entityId: ip, entityType: 'user' };
}

// ─── Middleware helpers ──────────────────────────────────────────────────────

function setQuotaHeaders(res: Response, status: QuotaStatus): void {
  // Use the smallest remaining value across all windows
  const minRemaining = Math.min(
    status.remaining.minute,
    status.remaining.hour,
    status.remaining.day
  );
  res.setHeader('X-RateLimit-Remaining', String(minRemaining));

  // Reset time for the tightest constraint
  let resetEpoch: number;
  if (status.remaining.minute === 0) {
    resetEpoch = Math.floor(status.resetAt.minute.getTime() / 1000);
  } else if (status.remaining.hour === 0) {
    resetEpoch = Math.floor(status.resetAt.hour.getTime() / 1000);
  } else {
    resetEpoch = Math.floor(status.resetAt.minute.getTime() / 1000);
  }
  res.setHeader('X-RateLimit-Reset', String(resetEpoch));
}

// ─── Express middleware ──────────────────────────────────────────────────────

/**
 * Express middleware that enforces per-user / per-bot quota limits.
 *
 * When the quota is exceeded a 429 response is returned with a `Retry-After`
 * header indicating how many seconds the client should wait.
 *
 * Successful requests have `X-RateLimit-Remaining` and `X-RateLimit-Reset`
 * headers attached to the response.
 */
export function quotaMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip in test environment
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_QUOTA === 'true') {
    return next();
  }

  const manager = getQuotaManager();
  const { entityId, entityType } = extractIdentity(req);

  manager
    .checkQuota(entityId, entityType)
    .then((status) => {
      setQuotaHeaders(res, status);

      if (!status.allowed) {
        const retryAfter = manager.retryAfterSeconds(status);
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({
          error: 'Quota exceeded',
          message: 'You have exceeded your request quota. Please try again later.',
          retryAfter,
          code: 'QUOTA_EXCEEDED',
          quota: {
            used: status.used,
            remaining: status.remaining,
          },
        });
        return;
      }

      // Consume one request unit
      manager.consumeQuota(entityId, entityType).then(() => next()).catch(next);
    })
    .catch((err) => {
      // On store failure, let the request through rather than blocking
      debug('Quota check failed, allowing request:', err);
      next();
    });
}

export { extractIdentity };
