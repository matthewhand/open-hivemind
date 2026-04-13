import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import logger from '../common/logger';

const debug = Debug('app:rateLimiter');

/**
 * Production-Grade Rate Limiting with Proper Storage
 *
 * Features:
 * - Redis-backed storage in production for distributed rate limiting
 * - In-memory storage with automatic cleanup for development
 * - Configurable limits per endpoint type
 * - Proper key generation considering proxies
 * - Graceful fallback when Redis is unavailable
 */

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Rate limit configuration from environment
const RATE_LIMIT_CONFIG = {
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '50000', 10),
  },
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '3600000', 10), // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '500', 10),
  },
  config: {
    windowMs: parseInt(process.env.RATE_LIMIT_CONFIG_WINDOW_MS || '300000', 10), // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_CONFIG_MAX || '20000', 10),
  },
  admin: {
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '20000', 10),
  },
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_API_MAX || '30000', 10),
  },
};

// Redis client and store state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisStore: (new (opts: Record<string, unknown>) => any) | null = null;
let redisAvailable = false;

// Store instances for memory fallback
class MemoryStoreWithCleanup {
  private hits = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.hits.entries()) {
        if (now > value.resetTime) {
          this.hits.delete(key);
        }
      }
    }, 60000);
  }

  increment(key: string): { totalHits: number; resetTime: number } {
    const now = Date.now();
    let record = this.hits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + this.windowMs };
    }
    record.count++;
    this.hits.set(key, record);
    return { totalHits: record.count, resetTime: record.resetTime };
  }

  decrement(key: string): void {
    const record = this.hits.get(key);
    if (record && record.count > 0) record.count--;
  }

  resetKey(key: string): void {
    this.hits.delete(key);
  }

  shutdown(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.hits.clear();
  }
}

const memoryStores = new Map<string, MemoryStoreWithCleanup>();

/**
 * Create appropriate store based on environment
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStore(prefix: string, windowMs: number): any {
  if (isProduction && redisAvailable && redisClient && RedisStore) {
    debug(`Creating Redis store for ${prefix}`);
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  }

  debug(`Creating memory store for ${prefix}`);
  if (!memoryStores.has(prefix)) {
    memoryStores.set(prefix, new MemoryStoreWithCleanup(windowMs));
  }
  return undefined; // express-rate-limit will use default MemoryStore
}

/**
 * Skip rate limiting for certain conditions
 */
function shouldSkipRateLimit(req: Request): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.DISABLE_RATE_LIMIT === 'true') return true;
  if (req.path === '/health' || req.path === '/api/health') return true;
  if (
    req.path.startsWith('/src/') ||
    req.path.startsWith('/node_modules/') ||
    req.path.startsWith('/@')
  )
    return true;

  if (!isProduction) {
    const ip = getClientKey(req);
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost') return true;
  }
  return false;
}

/**
 * Standard rate limit handler.
 */
function createRateLimitHandler(type: string) {
  const isSoftMode = process.env.RATE_LIMIT_SOFT === 'true';
  return (
    req: Request & { rateLimit?: { resetTime?: number; limit?: number } },
    res: Response,
    next: NextFunction
  ) => {
    const retryAfter = req.rateLimit?.resetTime
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      : 60;

    logger.warn(`Rate limit exceeded for ${type}${isSoftMode ? ' [SOFT]' : ''}`, {
      ip: getClientKey(req),
      path: req.originalUrl,
      limit: req.rateLimit?.limit,
    });

    if (isSoftMode) return next();

    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Limit', String(req.rateLimit?.limit ?? 0));
    res.setHeader('X-RateLimit-Remaining', '0');
    if (req.rateLimit?.resetTime)
      res.setHeader('X-RateLimit-Reset', String(req.rateLimit.resetTime));

    res.status(429).json({
      error: 'Too many requests',
      message: `You have exceeded the ${type} request limit. Please try again later.`,
      retryAfter,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  };
}

// --- CORE RATE LIMITERS (Exported at top level to break circular dependencies) ---

export const defaultRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.default.windowMs,
  max: RATE_LIMIT_CONFIG.default.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('default', RATE_LIMIT_CONFIG.default.windowMs),
  keyGenerator: getClientKey,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('default'),
});

export const configRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.config.windowMs,
  max: RATE_LIMIT_CONFIG.config.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('config', RATE_LIMIT_CONFIG.config.windowMs),
  keyGenerator: getClientKey,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('configuration'),
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.auth.windowMs,
  max: RATE_LIMIT_CONFIG.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth', RATE_LIMIT_CONFIG.auth.windowMs),
  keyGenerator: (req: Request) =>
    `${getClientKey(req)}:${req.body?.username || req.body?.email || ''}`,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('authentication'),
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

export const adminRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.admin.windowMs,
  max: RATE_LIMIT_CONFIG.admin.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('admin', RATE_LIMIT_CONFIG.admin.windowMs),
  keyGenerator: getClientKey,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('admin'),
});

export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.api.windowMs,
  max: RATE_LIMIT_CONFIG.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('api', RATE_LIMIT_CONFIG.api.windowMs),
  keyGenerator: getClientKey,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('API'),
});

// Aliases for compatibility
export {
  defaultRateLimiter as defaultLimiter,
  configRateLimiter as configLimiter,
  authRateLimiter as authLimiter,
  adminRateLimiter as adminLimiter,
  apiRateLimiter as apiLimiter,
};

// --- REDIS INITIALIZATION ---

async function initializeRedis(): Promise<void> {
  if (!isProduction) return;
  try {
    const redis = await import('redis');
    const rateLimitRedis = await import('rate-limit-redis');
    RedisStore = rateLimitRedis.RedisStore as unknown as new (opts: Record<string, unknown>) => any;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) return new Error('Redis connection failed');
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
      },
      disableOfflineQueue: true,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis error:', err);
      redisAvailable = false;
    });
    redisClient.on('connect', () => {
      debug('Redis connected');
      redisAvailable = true;
    });
    redisClient.on('disconnect', () => {
      redisAvailable = false;
    });

    await redisClient.connect();
    redisAvailable = true;
  } catch (err) {
    debug('Redis init failed:', err);
    redisAvailable = false;
  }
}

initializeRedis().catch((err) => debug('Redis init error:', err));

// --- IP & KEY HELPERS ---

function validateIP(ip: string): string | null {
  if (!ip || typeof ip !== 'string') return null;
  if (/[\r\n\0]/.test(ip)) return null;
  ip = ip.trim();
  const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) ip = ipv4Match[1];

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Result = ip.match(ipv4Regex);
  if (ipv4Result) {
    const octets = ipv4Result.slice(1, 5);
    for (const octet of octets) {
      if (octet.length > 1 && octet.startsWith('0')) return null;
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) return null;
    }
    return ip;
  }
  const ipv6Regex =
    /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::1$/;
  return ipv6Regex.test(ip) ? ip : null;
}

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return NaN;
  const nums = parts.map((p) => parseInt(p, 10));
  for (const num of nums) if (isNaN(num) || num < 0 || num > 255) return NaN;
  return nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2] * 0x100 + nums[3];
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    let cleanIP = ip;
    const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (ipv4Match) cleanIP = ipv4Match[1];
    if (!cleanIP.includes('.') || cleanIP.includes(':')) return false;
    const [network, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    const ipLong = ipToLong(cleanIP);
    const networkLong = ipToLong(network);
    if (isNaN(ipLong) || isNaN(networkLong)) return false;
    if (prefix === 0) return true;
    const mask = (-1 << (32 - prefix)) >>> 0;
    return (ipLong & mask) === (networkLong & mask);
  } catch {
    return false;
  }
}

let _trustedProxiesCache: { envValue: string | undefined; proxies: string[] } | null = null;
function getTrustedProxies(): string[] {
  const envValue = process.env.TRUSTED_PROXIES;
  if (_trustedProxiesCache && _trustedProxiesCache.envValue === envValue)
    return _trustedProxiesCache.proxies;
  let proxies = envValue
    ? envValue
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    : ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
  _trustedProxiesCache = { envValue, proxies };
  return proxies;
}

function isTrustedProxy(ip: string): boolean {
  const trustedProxies = getTrustedProxies();
  for (const trusted of trustedProxies) {
    if (trusted === '*' || ip === trusted || ip === `::ffff:${trusted}`) return true;
    if (trusted.includes('/') && isIPInCIDR(ip, trusted)) return true;
  }
  return false;
}

function getClientKey(req: Request): string {
  const connectionIP = validateIP(req.socket?.remoteAddress || 'unknown') || 'unknown';
  if (!isTrustedProxy(connectionIP)) return connectionIP;
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    for (let i = ips.length - 1; i >= 0; i--) {
      const validated = validateIP(ips[i]);
      if (validated && !isTrustedProxy(validated)) return validated;
    }
    const leftmost = validateIP(ips[0]);
    if (leftmost) return leftmost;
  }
  const realIP = req.get('x-real-ip');
  if (realIP) {
    const validated = validateIP(realIP);
    if (validated) return validated;
  }
  return connectionIP;
}

// --- BOT-SPECIFIC LIMITING ---

function getBotNameFromRequest(req: Request): string | undefined {
  if (req.params?.botName) return req.params.botName;
  if (req.params?.name) return req.params.name;
  if (req.params?.id) return req.params.id;
  if (typeof req.query?.botName === 'string') return req.query.botName;
  if (typeof req.query?.bot === 'string') return req.query.bot;
  if (typeof req.body?.botName === 'string') return req.body.botName;
  if (typeof req.body?.bot === 'string') return req.body.bot;
  return req.get('X-Bot-Name');
}

export const applyRateLimiting = async (req: Request, res: Response, next: NextFunction) => {
  if (shouldSkipRateLimit(req)) return next();
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
  )
    return authRateLimiter(req, res, next);
  if (path.startsWith('/api/auth') || path.startsWith('/api/admin') || path.startsWith('/api/'))
    return apiRateLimiter(req, res, next);
  return defaultRateLimiter(req, res, next);
};

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  prefix: string;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(options.prefix, options.windowMs),
    keyGenerator: getClientKey,
    skip: shouldSkipRateLimit,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
        code: 'RATE_LIMIT_EXCEEDED',
      });
    },
  });
}

export async function createBotRateLimiter(
  botName: string
): Promise<ReturnType<typeof rateLimit> | null> {
  try {
    const { getBotRateLimitSettings } = await import('../config/rateLimitConfig');
    const settings = getBotRateLimitSettings(botName);
    if (!settings || !settings.enabled) return null;
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

const botRateLimiters = new Map<string, ReturnType<typeof rateLimit>>();
export async function getBotRateLimiter(
  botName: string
): Promise<ReturnType<typeof rateLimit> | null> {
  if (botRateLimiters.has(botName)) return botRateLimiters.get(botName)!;
  const limiter = await createBotRateLimiter(botName);
  if (limiter) botRateLimiters.set(botName, limiter);
  return limiter;
}

export function clearBotRateLimiters(): void {
  botRateLimiters.clear();
}

export function getRateLimitStats() {
  return {
    redisAvailable,
    environment: process.env.NODE_ENV || 'development',
    config: RATE_LIMIT_CONFIG,
  };
}

export function shutdownRateLimiter(): void {
  for (const store of memoryStores.values()) store.shutdown();
  memoryStores.clear();
  if (redisClient) {
    redisClient.quit().catch(() => {});
  }
}

export {
  validateIP,
  isIPInCIDR,
  isTrustedProxy,
  getClientKey,
  ipToLong,
  getTrustedProxies,
  getBotNameFromRequest,
};
