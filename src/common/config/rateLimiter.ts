import rateLimit from 'express-rate-limit';
import Debug from 'debug';

const debug = Debug('app:config:rateLimiter');

/**
 * Creates a rate limiter for incoming requests.
 * 
 * @param {number} windowMs - The time frame in milliseconds for which requests are checked.
 * @param {number} max - The maximum number of allowed requests within the time frame.
 * @returns {rateLimit.RateLimitRequestHandler} The configured rate limiter.
 */
export function createRateLimiter(windowMs: number, max: number): rateLimit.RateLimitRequestHandler {
    debug('Creating rate limiter with windowMs:', windowMs, 'and max requests:', max);
    return rateLimit({
        windowMs,
        max,
        handler: (req, res) => {
            res.status(429).json({ message: 'Too many requests. Please try again later.' });
        },
    });
}
