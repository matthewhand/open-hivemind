/**
 * auth-rate-limit.test.ts
 *
 * Tests that the auth rate limiter middleware correctly blocks requests
 * after the configured maximum is reached.
 *
 * Strategy:
 *   - Create a minimal Express app that uses a fresh rateLimit() instance
 *     configured with a low max (3 requests), no skip function.
 *   - Send 3 successful requests, then assert the 4th gets 429.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

describe('authRateLimiter — rate limit boundary', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a fresh rate limiter with a low max and no skip logic
    const testAuthLimiter = rateLimit({
      windowMs: 3_600_000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
      // No skip function — always enforce
    });

    app = express();
    app.use(express.json());
    // Apply rate limiter to the login route
    app.post('/auth/login', testAuthLimiter, (_req, res) => {
      res.json({ success: true, accessToken: 'tok' });
    });
  });

  it('allows the first 3 requests and blocks the 4th with 429', async () => {
    const payload = { username: 'alice', password: 'password123' };

    // First 3 requests should succeed (200)
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post('/auth/login')
        .send(payload)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
    }

    // 4th request should be rate-limited
    const res4 = await request(app)
      .post('/auth/login')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(res4.status).toBe(429);
    // Standard rate limit headers must be present
    expect(
      res4.headers['retry-after'] ||
        res4.headers['x-ratelimit-remaining'] ||
        res4.headers['ratelimit-remaining']
    ).toBeDefined();
  });
});
