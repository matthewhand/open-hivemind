import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import logger from '../common/logger';
import {
  createRateLimitHandler,
  createStore,
  getClientKey,
  getTrustedProxies,
  ipToLong,
  isIPInCIDR,
  isTrustedProxy,
  memoryStores,
  setRedisAvailable,
  shouldSkipRateLimit,
  validateIP,
} from './rateLimiterCore';

const debug = Debug('app:rateLimiter');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Initialize Redis connection for distributed rate limiting
 */
async function initializeRedis(): Promise<void> {
  if (!isProduction) {
    debug('Skipping Redis initialization in non-production environment');
    return;
  }

  try {
    const redis = await import('redis');
    const rateLimitRedis = await import('rate-limit-redis');
    const RedisStore = rateLimitRedis.RedisStore as unknown as new (
      opts: Record<string, unknown>
    ) => any;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      debug('WARN:', 'REDIS_URL not set, using in-memory rate limiting');
      return;
    }

    const redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          debug(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 10000,
      },
      disableOfflineQueue: true,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error:', err);
      setRedisAvailable(false);
    });

    redisClient.on('connect', () => {
      debug('Redis connected for rate limiting');
      setRedisAvailable(true, redisClient, RedisStore);
    });

    redisClient.on('disconnect', () => {
      debug('Redis disconnected');
      setRedisAvailable(false);
    });

    await redisClient.connect();
    setRedisAvailable(true, redisClient, RedisStore);
    debug('Redis client initialized successfully');
  } catch (err) {
    debug('WARN:', 'Redis initialization failed, using in-memory rate limiting:', err);
    setRedisAvailable(false);
  }
}

// Initialize Redis on module load
initializeRedis().catch((err) => {
  debug('Redis initialization error:', err);
});

/**
 * Extract bot name from request
 */
function getBotNameFromRequest(req: Request): string | undefined {
  if (req.params?.botName) return req.params.botName;
  if (req.params?.name) return req.params.name;
  if (req.params?.id) return req.params.id;
  if (req.query?.botName && typeof req.query.botName === 'string') return req.query.botName;
  if (req.query?.bot && typeof req.query.bot === 'string') return req.query.bot;
  if (req.body?.botName && typeof req.body.botName === 'string') return req.body.botName;
  if (req.body?.bot && typeof req.body.bot === 'string') return req.body.bot;
  const botHeader = req.get('X-Bot-Name');
  if (botHeader) return botHeader;
  return undefined;
}

/**
 * Create a bot-specific rate limiter using guard profile settings
 */
export async function createBotRateLimiter(
  botName: string
): Promise<ReturnType<typeof rateLimit> | null> {
  try {
    const { getBotRateLimitSettings } = await import('../config/rateLimitConfig');
    const settings = getBotRateLimitSettings(botName);

    if (!settings || !settings.enabled) return null;

    debug(`Creating bot-specific rate limiter for ${botName}`);

    return rateLimit({
      windowMs: settings.windowMs,
      max: settings.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      store: createStore(`bot:${botName}`, settings.windowMs),
      keyGenerator: (req: Request) => `${getClientKey(req)}:${botName}`,
      skip: shouldSkipRateLimit,
      handler: (
        req: Request & { rateLimit?: { resetTime?: number; limit?: number } },
        res: Response
      ) => {
        const retryAfter = req.rateLimit?.resetTime
          ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
          : Math.ceil(settings.windowMs / 1000);

        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(settings.maxRequests));
        res.setHeader('X-RateLimit-Remaining', '0');
        if (req.rateLimit?.resetTime)
          res.setHeader('X-RateLimit-Reset', String(req.rateLimit.resetTime));

        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded for bot "${botName}".`,
          retryAfter,
          code: 'BOT_RATE_LIMIT_EXCEEDED',
          botName,
        });
      },
    });
  } catch {
    return null;
  }
}

// Cache for bot-specific rate limiters
const botRateLimiters = new Map<string, ReturnType<typeof rateLimit>>();
export async function getBotRateLimiter(
  botName: string
): Promise<ReturnType<typeof rateLimit> | null> {
  const cached = botRateLimiters.get(botName);
  if (cached) return cached;
  const limiter = await createBotRateLimiter(botName);
  if (limiter) botRateLimiters.set(botName, limiter);
  return limiter;
}

/**
 * Middleware to apply rate limiting based on route type
 */

export const applyRateLimiting = async (req: Request, res: Response, next: NextFunction) => {
  if (shouldSkipRateLimit(req)) return next();

  const {
    defaultRateLimiter,
    configRateLimiter,
    authRateLimiter,
    adminRateLimiter,
    apiRateLimiter,
  } = await import('./rateLimiters');

  const path = req.baseUrl ? req.baseUrl + req.path : req.path;
  const botName = getBotNameFromRequest(req);
  if (botName) {
    const botLimiter = await getBotRateLimiter(botName);
    if (botLimiter) return botLimiter(req, res, next);
  }

  if (path.startsWith('/api/config')) return configRateLimiter(req, res, next);
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/trusted-login' ||
    path.startsWith('/api/login')
  ) {
    return authRateLimiter(req, res, next);
  }
  if (path.startsWith('/api/auth') || path.startsWith('/api/'))
    return apiRateLimiter(req, res, next);
  if (path.startsWith('/api/admin')) return adminRateLimiter(req, res, next);

  return defaultRateLimiter(req, res, next);
};

export function clearBotRateLimiters(): void {
  botRateLimiters.clear();
}

export function shutdownRateLimiter(): void {
  for (const store of memoryStores.values()) store.shutdown();
  memoryStores.clear();
}

// Export all limiters from the new file
export * from './rateLimiters';

// Export helper functions
export {
  getClientKey,
  shouldSkipRateLimit,
  createRateLimitHandler,
  getBotNameFromRequest,
  validateIP,
  isIPInCIDR,
  isTrustedProxy,
  ipToLong,
  getTrustedProxies,
};
