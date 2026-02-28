import rateLimit from 'express-rate-limit';

/**
 * Auth rate limiter - stricter limits for authentication endpoints
 * Limits: 5 requests per minute
 * Applied to: login, register, refresh token endpoints
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Read operations rate limiter
 * Limits: 100 requests per minute
 * Applied to: GET endpoints
 */
export const readLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Write operations rate limiter
 * Limits: 30 requests per minute
 * Applied to: POST, PUT, DELETE endpoints
 */
export const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { error: 'Too many write requests, please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});
