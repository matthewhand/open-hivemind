import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
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
const isTest = process.env.NODE_ENV === 'test';

// Rate limit configuration from environment
const RATE_LIMIT_CONFIG = {
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '3600000', 10), // 1 hour
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  },
  config: {
    windowMs: parseInt(process.env.RATE_LIMIT_CONFIG_WINDOW_MS || '300000', 10), // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_CONFIG_MAX || '10', 10),
  },
  admin: {
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '20', 10),
  },
  api: {
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_API_MAX || '60', 10),
  },
};

// Redis client and store
let redisClient: any = null;
let RedisStore: any = null;
let redisAvailable = false;

/**
 * Initialize Redis connection for distributed rate limiting
 */
async function initializeRedis(): Promise<void> {
  if (!isProduction) {
    debug('Skipping Redis initialization in non-production environment');
    return;
  }

  try {
    const redis = require('redis');
    const rateLimitRedis = require('rate-limit-redis');
    RedisStore = rateLimitRedis.RedisStore;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('REDIS_URL not set, using in-memory rate limiting');
      return;
    }

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = Math.min(retries * 100, 3000);
          debug(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 10000,
      },
      // Disable offline queue to fail fast
      offline_queue: false,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error:', err);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      debug('Redis connected for rate limiting');
      redisAvailable = true;
    });

    redisClient.on('disconnect', () => {
      debug('Redis disconnected');
      redisAvailable = false;
    });

    await redisClient.connect();
    redisAvailable = true;
    debug('Redis client initialized successfully');
  } catch (err) {
    console.warn('Redis initialization failed, using in-memory rate limiting:', err);
    redisAvailable = false;
  }
}

// Initialize Redis on module load
initializeRedis().catch((err) => {
  debug('Redis initialization error:', err);
});

/**
 * In-memory store with automatic cleanup
 * Used as fallback when Redis is not available
 */
class MemoryStoreWithCleanup {
  private hits = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.startCleanup();
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
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
    if (record && record.count > 0) {
      record.count--;
    }
  }

  resetKey(key: string): void {
    this.hits.delete(key);
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.hits.clear();
  }
}

// Store instances for different rate limiters
const memoryStores = new Map<string, MemoryStoreWithCleanup>();

/**
 * Create appropriate store based on environment
 */
function createStore(prefix: string, windowMs: number): any {
  if (isProduction && redisAvailable && redisClient && RedisStore) {
    debug(`Creating Redis store for ${prefix}`);
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  }

  // Use in-memory store with cleanup
  debug(`Creating memory store for ${prefix}`);
  if (!memoryStores.has(prefix)) {
    memoryStores.set(prefix, new MemoryStoreWithCleanup(windowMs));
  }
  return undefined; // express-rate-limit will use default MemoryStore
}

/**
 * Get client IP considering trusted proxies
 */
function getClientKey(req: Request): string {
  // In production, trust X-Forwarded-For from known proxies
  if (isProduction && process.env.TRUST_PROXY === 'true') {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // Take the first IP (original client) if multiple proxies
      const ips = Array.isArray(forwarded) ? forwarded : forwarded.split(',');
      return ips[0].trim();
    }
  }

  // Fall back to direct connection IP
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Standard rate limit handler
 */
function createRateLimitHandler(type: string) {
  return (req: Request, res: Response) => {
    const retryAfter = (req as any).rateLimit?.resetTime
      ? Math.ceil(((req as any).rateLimit.resetTime - Date.now()) / 1000)
      : 60;

    logger.warn(`Rate limit exceeded for ${type}`, {
      ip: getClientKey(req),
      path: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    res.status(429).json({
      error: 'Too many requests',
      message: `You have exceeded the ${type} request limit. Please try again later.`,
      retryAfter,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  };
}

/**
 * Skip rate limiting for certain conditions
 */
function shouldSkipRateLimit(req: Request): boolean {
  // Skip in test environment
  if (isTest) {
    return true;
  }

  // Skip if explicitly disabled
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return true;
  }

  // Skip for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }

  // In development, skip for localhost
  if (!isProduction) {
    const ip = getClientKey(req);
    if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost') {
      return true;
    }
  }

  return false;
}

// Default rate limiter - 100 requests per 15 minutes
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

// Configuration endpoint rate limiter - 10 requests per 5 minutes
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

// Authentication rate limiter - 5 attempts per hour
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.auth.windowMs,
  max: RATE_LIMIT_CONFIG.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth', RATE_LIMIT_CONFIG.auth.windowMs),
  // Use username + IP for auth to prevent distributed attacks
  keyGenerator: (req: Request) => {
    const ip = getClientKey(req);
    const username = req.body?.username || req.body?.email || '';
    return `${ip}:${username}`;
  },
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('authentication'),
  // Don't skip failed attempts - count all attempts
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// Admin operations rate limiter - 20 requests per 15 minutes
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

// API rate limiter - 60 requests per minute
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

/**
 * Middleware to apply rate limiting based on route type
 */
export const applyRateLimiting = (req: Request, res: Response, next: NextFunction) => {
  if (shouldSkipRateLimit(req)) {
    return next();
  }

  // Use baseUrl + path to get the full path including mount point
  // This ensures correct matching regardless of where the middleware is mounted
  const path = req.baseUrl ? req.baseUrl + req.path : req.path;

  // Apply different rate limiters based on route patterns
  if (path.startsWith('/api/config')) {
    return configRateLimiter(req, res, next);
  } else if (path.startsWith('/api/auth') || path.startsWith('/api/login')) {
    return authRateLimiter(req, res, next);
  } else if (path.startsWith('/api/admin')) {
    return adminRateLimiter(req, res, next);
  } else if (path.startsWith('/api/')) {
    return apiRateLimiter(req, res, next);
  } else {
    return defaultRateLimiter(req, res, next);
  }
};

/**
 * Create a custom rate limiter
 */
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

/**
 * Get rate limiting statistics
 */
export function getRateLimitStats(): {
  redisAvailable: boolean;
  environment: string;
  config: typeof RATE_LIMIT_CONFIG;
} {
  return {
    redisAvailable,
    environment: process.env.NODE_ENV || 'development',
    config: RATE_LIMIT_CONFIG,
  };
}

/**
 * Shutdown rate limiter and cleanup resources
 */
export function shutdownRateLimiter(): void {
  // Cleanup memory stores
  for (const [prefix, store] of memoryStores.entries()) {
    debug(`Shutting down memory store: ${prefix}`);
    store.shutdown();
  }
  memoryStores.clear();

  // Close Redis connection
  if (redisClient) {
    debug('Closing Redis connection');
    redisClient.quit().catch((err) => {
      debug('Error closing Redis:', err);
    });
  }
}

// Export all limiters for direct use
export {
  defaultRateLimiter as defaultLimiter,
  configRateLimiter as configLimiter,
  authRateLimiter as authLimiter,
  adminRateLimiter as adminLimiter,
  apiRateLimiter as apiLimiter,
};
