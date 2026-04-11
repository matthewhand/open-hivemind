/**
 * auth-rate-limit.test.ts
 *
 * Tests the REAL authRateLimiter (express-rate-limit) against the login endpoint.
 *
 * Strategy:
 *   - Use jest.isolateModules() to re-require the rate limiter with NODE_ENV='production'
 *     so that both the `isTest` bypass and the dev+localhost bypass are disabled.
 *   - Set RATE_LIMIT_AUTH_MAX=3 so the limit is easy to hit.
 *   - Mock AuthManager so the handler returns 200 on valid requests.
 *   - Send 3 successful requests, then assert the 4th gets 429.
 */

import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '../../../src/middleware/errorHandler';

// Saved env values restored in afterAll
const savedNodeEnv = process.env.NODE_ENV;
const savedAuthMax = process.env.RATE_LIMIT_AUTH_MAX;
const savedWindowMs = process.env.RATE_LIMIT_AUTH_WINDOW_MS;

describe('authRateLimiter — rate limit boundary', () => {
  let app: express.Application;

  beforeAll(() => {
    // Override env vars BEFORE the isolated module load so the rate limiter
    // picks them up at module evaluation time.
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_AUTH_MAX = '3';
    // Use a long window so the limit is not accidentally reset mid-test
    process.env.RATE_LIMIT_AUTH_WINDOW_MS = '3600000';

    // Build a fresh AuthManager mock and Express app inside isolateModules
    // so the rate limiter module is freshly evaluated with the overridden NODE_ENV.
    jest.isolateModules(() => {
      // Set up AuthManager mock inside the isolated scope
      const mockAuthManager = {
        login: jest.fn().mockResolvedValue({
          accessToken: 'tok',
          refreshToken: 'ref',
          user: { id: '1', username: 'alice', role: 'user' },
        }),
        register: jest.fn(),
        refreshToken: jest.fn(),
        logout: jest.fn(),
        verifyAccessToken: jest.fn(),
        getUser: jest.fn(),
        getUserWithHash: jest.fn(),
        verifyPassword: jest.fn(),
        changePassword: jest.fn(),
        getAllUsers: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserPermissions: jest.fn(),
        trustedLogin: jest.fn(),
        generateAccessToken: jest.fn(),
      };

      jest.doMock('../../../src/auth/AuthManager', () => ({
        AuthManager: {
          getInstance: jest.fn(() => mockAuthManager),
        },
      }));

      // Require the router AFTER the mock is in place so the module cache picks
      // it up, and AFTER NODE_ENV is set to 'production' so the rate limiter
      // is freshly initialised without the test/dev bypasses.
      const authRouter = require('../../../src/server/routes/auth').default;

      app = express();
      app.use(express.json());
      app.use('/auth', authRouter);
      app.use(globalErrorHandler);
    });
  });

  afterAll(() => {
    // Restore env vars
    if (savedNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = savedNodeEnv;
    }

    if (savedAuthMax === undefined) {
      delete process.env.RATE_LIMIT_AUTH_MAX;
    } else {
      process.env.RATE_LIMIT_AUTH_MAX = savedAuthMax;
    }

    if (savedWindowMs === undefined) {
      delete process.env.RATE_LIMIT_AUTH_WINDOW_MS;
    } else {
      process.env.RATE_LIMIT_AUTH_WINDOW_MS = savedWindowMs;
    }

    jest.resetModules();
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
    // The rate limit handler sets Retry-After and X-RateLimit headers
    expect(
      res4.headers['retry-after'] ||
        res4.headers['x-ratelimit-remaining'] ||
        res4.headers['ratelimit-remaining']
    ).toBeDefined();
  });
});
