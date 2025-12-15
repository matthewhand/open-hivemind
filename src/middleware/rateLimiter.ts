import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../common/logger';

// Skip Redis in development
const isProduction = process.env.NODE_ENV === 'production';

// Create Redis client only in production
let redisClient: any = null;
let RedisStore: any = null;

if (isProduction) {
  try {
    const redis = require('redis');
    const rateLimitRedis = require('rate-limit-redis');
    RedisStore = rateLimitRedis.RedisStore;

    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 5000)
      }
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.connect().catch(() => {
      console.warn('Failed to connect to Redis for rate limiting');
    });
  } catch (err) {
    console.warn('Redis not available, using memory store for rate limiting');
  }
}

// Helper to create store - Redis in production, memory in development
const createStore = (prefix: string) => {
  if (isProduction && redisClient && RedisStore) {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rate_limit:${prefix}:`
    });
  }
  return undefined; // Uses default MemoryStore
};

// Default rate limiter - 100 requests per 15 minutes
export const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('default'),
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the request limit. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

// Configuration endpoint rate limiter - 10 requests per 5 minutes
export const configRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('config'),
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many configuration requests',
      message: 'Configuration endpoint request limit exceeded. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

// Authentication rate limiter - 5 attempts per hour
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth'),
  keyGenerator: (req: Request) => req.body?.username || req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Too many failed login attempts. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

// Admin operations rate limiter - 20 requests per 15 minutes
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('admin'),
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many admin requests',
      message: 'Admin operations request limit exceeded. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

// Middleware to apply rate limiting based on route type
export const applyRateLimiting = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting entirely in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Skip rate limiting if disabled via env
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  // Skip rate limiting for localhost requests (any variant)
  const ip = req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'] || '';
  const ipStr = Array.isArray(ip) ? ip[0] : ip;
  if ((ipStr.includes('127.0.0.1') || ipStr.includes('::1') || ipStr.includes('localhost') || ipStr === '') && process.env.NODE_ENV !== 'test') {
    return next();
  }

  const path = req.path;

  // Apply different rate limiters based on route patterns
  if (path.startsWith('/api/config')) {
    return configRateLimiter(req, res, next);
  } else if (path.startsWith('/api/auth') || path.startsWith('/api/login')) {
    return authRateLimiter(req, res, next);
  } else if (path.startsWith('/api/admin')) {
    return adminRateLimiter(req, res, next);
  } else {
    return defaultRateLimiter(req, res, next);
  }
};

// Export all limiters for direct use
export {
  defaultRateLimiter as defaultLimiter,
  configRateLimiter as configLimiter,
  authRateLimiter as authLimiter,
  adminRateLimiter as adminLimiter
};