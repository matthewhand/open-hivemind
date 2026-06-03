/**
 * Regression test for audit #20 (csrf-wiring).
 *
 * src/server/middleware/csrf.ts is correct, but csrfProtection was only mounted
 * in the inactive HivemindServer (src/server/server.ts), NOT in the active
 * entrypoint's route setup (src/server/registerRoutes.ts, used by src/index.ts).
 *
 * These tests assert that registerRoutes() actually wires csrfProtection onto
 * state-changing /api requests, while leaving safe methods, the token endpoint,
 * and the auth routes reachable.
 */
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '@src/server/registerRoutes';

const buildApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  // Match the active entrypoint: cookies are parsed lazily inside the middleware,
  // so no cookie-parser is required for these assertions.
  registerRoutes(app, {
    frontendDistPath: '/tmp/does-not-exist',
    viteServerRef: { current: undefined },
  });
  return app;
};

describe('CSRF wiring on the active entrypoint (registerRoutes)', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_SKIP = process.env.CSRF_SKIP_IN_TEST;
  const ORIGINAL_ALLOW_IPS = process.env.HTTP_ALLOW_ALL_IPS;

  beforeAll(() => {
    // Ensure CSRF is actually enforced even though NODE_ENV may be 'test'.
    process.env.CSRF_SKIP_IN_TEST = 'false';
    // Avoid IP-whitelist 403s masking the CSRF behaviour we are testing.
    process.env.HTTP_ALLOW_ALL_IPS = 'true';
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_SKIP === undefined) delete process.env.CSRF_SKIP_IN_TEST;
    else process.env.CSRF_SKIP_IN_TEST = ORIGINAL_SKIP;
    if (ORIGINAL_ALLOW_IPS === undefined) delete process.env.HTTP_ALLOW_ALL_IPS;
    else process.env.HTTP_ALLOW_ALL_IPS = ORIGINAL_ALLOW_IPS;
  });

  it('rejects a state-changing /api request that lacks a CSRF token (403)', async () => {
    const app = buildApp();
    // /api/bot-config is mounted without authenticateToken, so the request
    // reaches the CSRF middleware. Without a token it must be blocked.
    const res = await request(app).post('/api/bot-config').send({ any: 'payload' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('lets safe GET requests through CSRF (token endpoint reachable)', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/csrf-token');

    expect(res.status).toBe(200);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken.length).toBeGreaterThan(0);
  });

  it('exempts /api/auth from CSRF so login works before a token exists', async () => {
    const app = buildApp();
    // We only assert that the request is NOT blocked by CSRF. The login handler
    // itself will reject bad credentials (401/4xx) — the key point is the
    // response must not be a CSRF rejection.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'wrong' });

    expect(res.body?.code).not.toBe('CSRF_TOKEN_MISSING');
    expect(res.body?.code).not.toBe('CSRF_TOKEN_INVALID');
  });

  it('accepts a state-changing request that carries a valid CSRF token', async () => {
    const app = buildApp();
    const agent = request.agent(app);

    // 1. Fetch a token (also sets the session + token cookies on the agent).
    const tokenRes = await agent.get('/api/csrf-token');
    expect(tokenRes.status).toBe(200);
    const token: string = tokenRes.body.csrfToken;
    expect(token).toBeTruthy();

    // 2. Re-use the same agent (carries cookies) and send the token in the header.
    const res = await agent
      .post('/api/bot-config')
      .set('X-CSRF-Token', token)
      .send({ any: 'payload' });

    // The CSRF gate must pass — the response must NOT be a CSRF rejection.
    // (The downstream handler may return its own status for the dummy payload.)
    expect(res.body?.code).not.toBe('CSRF_TOKEN_MISSING');
    expect(res.body?.code).not.toBe('CSRF_TOKEN_INVALID');
  });
});
