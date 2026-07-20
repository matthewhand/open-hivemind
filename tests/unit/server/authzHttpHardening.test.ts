/**
 * Express-stack regression tests for the critical authz fixes:
 *  1. Non-admin PATCH /api/auth/profile cannot escalate role to admin
 *  2. Non-admin GET /api/secure-config is 403 (admin-only secrets)
 *
 * Uses the real registerRoutes mount (authenticate + validate + requireAdmin)
 * so schema strip + middleware gates are exercised end-to-end.
 */
import express from 'express';
import request from 'supertest';
import { AuthManager } from '@src/auth/AuthManager';
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

describe('authz HTTP hardening', () => {
  const ORIGINAL_ENV = {
    ALLOW_TEST_BYPASS: process.env.ALLOW_TEST_BYPASS,
    ALLOW_LOCALHOST_ADMIN: process.env.ALLOW_LOCALHOST_ADMIN,
    SKIP_AUTH: process.env.SKIP_AUTH,
    HTTP_ALLOW_ALL_IPS: process.env.HTTP_ALLOW_ALL_IPS,
  };

  beforeAll(() => {
    delete process.env.ALLOW_TEST_BYPASS;
    delete process.env.ALLOW_LOCALHOST_ADMIN;
    delete process.env.SKIP_AUTH;
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
    return token as string;
  };

  const registerAndLoginUser = async (
    app: express.Application,
    adminToken: string
  ): Promise<{ token: string; userId: string; username: string }> => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const username = `user_${suffix}`.slice(0, 30);
    const email = `${username}@example.com`;

    // RegisterSchema requires upper + lower + digit (not just min length).
    const password = 'Password123';
    const reg = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username,
        email,
        password,
        role: 'user',
      });
    if (reg.status !== 201) {
      // Surface validation body on failure for easier debugging.

      console.error('register failed', reg.status, reg.body);
    }
    expect(reg.status).toBe(201);
    const userId = reg.body?.data?.user?.id as string;
    expect(userId).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({ username, password });
    expect(login.status).toBe(200);
    const token = login.body?.data?.accessToken as string;
    expect(typeof token).toBe('string');

    return { token, userId, username };
  };

  it('rejects profile role escalation: user stays non-admin after PATCH with role=admin', async () => {
    const app = buildApp();
    const adminToken = await loginAsAdmin(app);
    const { token, userId } = await registerAndLoginUser(app, adminToken);

    const patch = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: `escalation-${Date.now()}@example.com`,
        role: 'admin',
        isActive: true,
        passwordHash: 'attacker',
      });

    // Request should succeed for allowed fields, but role must not stick.
    expect(patch.status).toBe(200);
    expect(patch.body?.data?.user?.role).toBe('user');
    expect(patch.body?.data?.user).not.toHaveProperty('passwordHash');

    // Live store must still show role=user (not just the response sanitize).
    const stored = AuthManager.getInstance().getUser(userId);
    expect(stored?.role).toBe('user');

    // Elevated APIs still forbidden with the same token.
    const adminOnly = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${token}`);
    expect(adminOnly.status).toBe(403);
  });

  it('returns 403 for non-admin on /api/secure-config', async () => {
    const app = buildApp();
    const adminToken = await loginAsAdmin(app);
    const { token } = await registerAndLoginUser(app, adminToken);

    const res = await request(app)
      .get('/api/secure-config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allows admin to list /api/secure-config (not 403)', async () => {
    const app = buildApp();
    const adminToken = await loginAsAdmin(app);

    const res = await request(app)
      .get('/api/secure-config')
      .set('Authorization', `Bearer ${adminToken}`);

    // May be 200 with a list or 500 if secure storage is misconfigured in test —
    // the regression we care about is that admin is not rejected with 403.
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('derives permissions from live role after demotion (stale JWT permissions ignored)', async () => {
    const app = buildApp();
    const adminToken = await loginAsAdmin(app);
    const { token, userId } = await registerAndLoginUser(app, adminToken);

    // Promote to admin via admin API so the *user* has admin role while we mint
    // a token... actually we already have a user token. Promote then demote
    // while keeping the original user token to prove requireRole uses live role.
    const promote = await request(app)
      .put(`/api/auth/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    expect(promote.status).toBe(200);

    // Fresh login as the promoted user — token says admin.
    const stored = AuthManager.getInstance().getUser(userId)!;
    const loginAsElevated = await request(app)
      .post('/api/auth/login')
      .send({ username: stored.username, password: 'Password123' });
    expect(loginAsElevated.status).toBe(200);
    const elevatedToken = loginAsElevated.body?.data?.accessToken as string;

    // Demote while elevated token is still valid.
    const demote = await request(app)
      .put(`/api/auth/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });
    expect(demote.status).toBe(200);

    // Stale admin token must NOT pass requireAdmin (role check is live).
    const afterDemote = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${elevatedToken}`);
    expect(afterDemote.status).toBe(403);

    // Original non-admin token still non-admin.
    const stillUser = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${token}`);
    expect(stillUser.status).toBe(403);
  });
});
