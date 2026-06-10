/**
 * Regression tests for the auth-middleware consolidation
 * (tech-debt/security: two parallel auth middlewares).
 *
 * Previously two middlewares guarded different route subsets with different
 * logic:
 *   - src/auth/middleware.ts        (`authenticate`)      — e.g. /api/auth/users
 *   - src/server/middleware/auth.ts (`authenticateToken`) — e.g. /api/errors/stats
 *
 * The latter was deleted and all consumers migrated to the canonical
 * src/auth/middleware.ts. These tests pin the security contract for a
 * representative protected route from EACH former middleware's set:
 *   - 401 without credentials
 *   - 401 with a garbage token (unified — the deleted middleware returned 403)
 *   - 200 with a valid admin token
 *
 * SECURITY: these assertions exist to prove the consolidation did not weaken
 * authentication on either route subset.
 */
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '@src/server/registerRoutes';

const buildApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  registerRoutes(app, {
    frontendDistPath: '/tmp/does-not-exist',
    viteServerRef: { current: undefined },
  });
  return app;
};

// One route formerly guarded by each middleware.
const FORMER_AUTH_MIDDLEWARE_ROUTE = '/api/auth/users'; // src/auth/middleware.ts (authenticate + requireAdmin)
const FORMER_SERVER_MIDDLEWARE_ROUTE = '/api/errors/stats'; // src/server/middleware/auth.ts (authenticateToken)

describe('auth middleware consolidation — protected routes keep requiring auth', () => {
  const ORIGINAL_ENV = {
    ALLOW_TEST_BYPASS: process.env.ALLOW_TEST_BYPASS,
    ALLOW_LOCALHOST_ADMIN: process.env.ALLOW_LOCALHOST_ADMIN,
    SKIP_AUTH: process.env.SKIP_AUTH,
    HTTP_ALLOW_ALL_IPS: process.env.HTTP_ALLOW_ALL_IPS,
  };

  beforeAll(() => {
    // Supertest requests originate from 127.0.0.1 — make sure no bypass flag
    // can mask a missing auth gate.
    delete process.env.ALLOW_TEST_BYPASS;
    delete process.env.ALLOW_LOCALHOST_ADMIN;
    delete process.env.SKIP_AUTH;
    // Avoid IP-whitelist 403s masking the auth behaviour under test.
    process.env.HTTP_ALLOW_ALL_IPS = 'true';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const loginAsAdmin = async (app: express.Application): Promise<string> => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123!' });
    expect(res.status).toBe(200);
    const token = res.body?.data?.accessToken;
    expect(typeof token).toBe('string');
    return token;
  };

  describe.each([
    ['former src/auth/middleware.ts set', FORMER_AUTH_MIDDLEWARE_ROUTE],
    ['former src/server/middleware/auth.ts set', FORMER_SERVER_MIDDLEWARE_ROUTE],
  ])('%s — GET %s', (_label, route) => {
    it('returns 401 without credentials', async () => {
      const app = buildApp();
      const res = await request(app).get(route);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Access token required' });
    });

    it('returns 401 (not 403) for a garbage bearer token', async () => {
      const app = buildApp();
      const res = await request(app).get(route).set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired token' });
    });

    it('returns 200 with a valid admin token', async () => {
      const app = buildApp();
      const token = await loginAsAdmin(app);

      const res = await request(app).get(route).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  it('does not bypass auth when ALLOW_TEST_BYPASS=true AND NODE_ENV=production (refuses with 500)', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.ALLOW_TEST_BYPASS = 'true';
    process.env.NODE_ENV = 'production';
    try {
      const app = buildApp();
      const res = await request(app).get(FORMER_SERVER_MIDDLEWARE_ROUTE);

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/ALLOW_TEST_BYPASS cannot be used in production/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      delete process.env.ALLOW_TEST_BYPASS;
    }
  });
});
