import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RATE_LIMIT_CONFIG } from '../config/rateLimitConfig';
import {
  createRateLimitHandler,
  createStore,
  getClientKey,
  shouldSkipRateLimit,
} from './rateLimiterCore';

// Default rate limiter - 50k requests per 15 minutes
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

// Configuration endpoint rate limiter - 20k requests per 5 minutes
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

// Authentication rate limiter - 500 attempts per hour
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

// Admin operations rate limiter - 20k requests per 15 minutes
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

// API rate limiter - 30k requests per minute
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

// Export aliases
export {
  defaultRateLimiter as defaultLimiter,
  configRateLimiter as configLimiter,
  authRateLimiter as authLimiter,
  adminRateLimiter as adminLimiter,
  apiRateLimiter as apiLimiter,
};
