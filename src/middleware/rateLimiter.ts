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
 * Validate IP address format
 * Returns null if the IP is invalid or potentially malicious
 */
function validateIP(ip: string): string | null {
  if (!ip || typeof ip !== 'string') {
    return null;
  }

  // Reject IPs with suspicious characters BEFORE trimming (prevent header injection)
  // This must come before trim() to catch trailing newlines like '192.168.1.1\r\n'
  if (/[\r\n\0]/.test(ip)) {
    return null;
  }

  // Trim whitespace
  ip = ip.trim();

  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    ip = ipv4Match[1];
  }

  // Validate IPv4 format
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Result = ip.match(ipv4Regex);
  if (ipv4Result) {
    const [, a, b, c, d] = ipv4Result;
    const octets = [a, b, c, d];
    for (const octet of octets) {
      // Reject leading zeros (octal confusion attack) - only "0" is allowed
      if (octet.length > 1 && octet.startsWith('0')) {
        return null;
      }
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return null;
      }
    }
    return ip;
  }

  // Validate IPv6 format (basic check)
  const ipv6Regex =
    /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::1$/;
  if (ipv6Regex.test(ip)) {
    return ip;
  }

  return null;
}

/**
 * Convert IPv4 address to numeric representation for comparison
 */
function ipToLong(ip: string): number {
  if (!ip || typeof ip !== 'string') {
    return NaN;
  }

  const parts = ip.split('.');
  if (parts.length !== 4) {
    return NaN;
  }

  const nums = parts.map((p) => parseInt(p, 10));

  for (const num of nums) {
    if (isNaN(num) || num < 0 || num > 255) {
      return NaN;
    }
  }

  return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

/**
 * Check if an IP address is in a CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    let cleanIP = ip;
    const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (ipv4Match) {
      cleanIP = ipv4Match[1];
    }

    if (!cleanIP.includes('.') || cleanIP.includes(':')) {
      return false;
    }

    const [network, prefixStr] = cidr.split('/');
    if (!network.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return false;
    }

    const prefix = parseInt(prefixStr, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipLong = ipToLong(cleanIP);
    const networkLong = ipToLong(network);

    if (isNaN(ipLong) || isNaN(networkLong)) {
      return false;
    }

    if (prefix === 0) {
      return true;
    }

    const mask = -1 << (32 - prefix);

    return (ipLong & mask) === (networkLong & mask);
  } catch (e) {
    return false;
  }
}

/**
 * Get list of trusted proxies from environment or defaults
 */
function getTrustedProxies(): string[] {
  const envProxies = process.env.TRUSTED_PROXIES;
  if (envProxies) {
    return envProxies
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
  }

  // Default trusted proxies - localhost and private network ranges
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
}

/**
 * Check if an IP address matches a trusted proxy
 */
function isTrustedProxy(ip: string): boolean {
  const trustedProxies = getTrustedProxies();

  for (const trusted of trustedProxies) {
    if (!trusted.includes('/')) {
      if (ip === trusted || ip === `::ffff:${trusted}`) {
        return true;
      }
    }

    if (trusted === '*') {
      return true;
    }

    if (trusted.includes('/')) {
      if (isIPInCIDR(ip, trusted)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get client IP considering trusted proxies
 *
 * SECURITY FIX: This function now properly validates that proxy headers are only
 * trusted when the request comes from a trusted proxy. Uses the RIGHT-MOST IP
 * from the trusted proxy chain to prevent IP spoofing attacks.
 *
 * Previous vulnerable code used ips[0] (leftmost/client-controlled) which allowed
 * attackers to spoof any IP address in the X-Forwarded-For header.
 */
function getClientKey(req: Request): string {
  // Get the actual connection IP
  const connectionIP = req.socket?.remoteAddress || 'unknown';
  const validatedConnectionIP = validateIP(connectionIP) || 'unknown';

  // Only trust proxy headers if the connection comes from a trusted proxy
  if (!isTrustedProxy(validatedConnectionIP)) {
    debug('Untrusted proxy - using connection IP:', validatedConnectionIP);
    return validatedConnectionIP;
  }

  // Trust proxy headers - check X-Forwarded-For
  // X-Forwarded-For format: client, proxy1, proxy2, ..., proxyN (closest to server)
  // We take the RIGHT-MOST IP (the one closest to our trusted proxy) to prevent spoofing
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());

    // Walk from right (closest to server/trusted proxy) to left (original client)
    // Find the first IP that is NOT a trusted proxy - this is the client IP
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i];
      const validated = validateIP(ip);

      if (!validated) {
        continue;
      }

      // If this IP is not a trusted proxy, it's the client IP
      if (!isTrustedProxy(validated)) {
        debug(
          'Using client IP from X-Forwarded-For:',
          validated,
          'via trusted proxy:',
          validatedConnectionIP
        );
        return validated;
      }
    }

    // If all IPs are trusted proxies (e.g., internal request), use the leftmost
    const leftmost = validateIP(ips[0]);
    if (leftmost) {
      debug('All IPs trusted, using leftmost:', leftmost);
      return leftmost;
    }
  }

  // Fall back to X-Real-IP if available
  const realIP = req.get('x-real-ip');
  if (realIP) {
    const validated = validateIP(realIP);
    if (validated) {
      debug('Using X-Real-IP:', validated, 'via trusted proxy:', validatedConnectionIP);
      return validated;
    }
  }

  // Fall back to connection remote address
  debug('No valid proxy headers, using connection IP:', validatedConnectionIP);
  return validatedConnectionIP;
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
