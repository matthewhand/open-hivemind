/**
 * Integration tests for wiring SessionManager into the auth HTTP flow.
 *
 * Verifies that:
 *   - With SESSION_MANAGER_ENABLED unset/false, login behaves exactly as before
 *     (stateless token, no session tracking) — existing auth is untouched.
 *   - With SESSION_MANAGER_ENABLED=true, login issues a session-tracked access
 *     token, /rotate exchanges it for a fresh one, and logout invalidates it.
 *
 * SECURITY: these assertions exist to prove the feature is strictly additive and
 * opt-in, and never weakens the existing token-auth path.
 */
import express from 'express';
import request from 'supertest';
import { SessionManager } from '@src/auth/SessionManager';
import { globalErrorHandler } from '@src/middleware/errorHandler';
import authRouter from '@src/server/routes/auth';

const buildApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(globalErrorHandler);
  return app;
};

const ORIGINAL_FLAG = process.env.SESSION_MANAGER_ENABLED;

const login = async (app: express.Application) =>
  request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123!' });

afterEach(async () => {
  // Clean any sessions created for admin between tests.
  await SessionManager.getInstance().invalidateUserSessions('admin');
  if (ORIGINAL_FLAG === undefined) delete process.env.SESSION_MANAGER_ENABLED;
  else process.env.SESSION_MANAGER_ENABLED = ORIGINAL_FLAG;
});

describe('auth login wiring with SessionManager disabled (default)', () => {
  beforeEach(() => {
    delete process.env.SESSION_MANAGER_ENABLED;
  });

  it('logs in and returns a token that is NOT tracked as a session', async () => {
    const app = buildApp();
    const res = await login(app);

    expect(res.status).toBe(200);
    const token = res.body?.data?.accessToken;
    expect(typeof token).toBe('string');

    // No session should have been created.
    expect(SessionManager.getInstance().getStore().hasToken(token)).toBe(false);
  });

  it('rejects /rotate with 404 when session management is disabled', async () => {
    const app = buildApp();
    const res = await login(app);
    const token = res.body?.data?.accessToken;

    const rotate = await request(app)
      .post('/api/auth/rotate')
      .set('Authorization', `Bearer ${token}`);

    expect(rotate.status).toBe(404);
  });
});

describe('auth login wiring with SessionManager enabled', () => {
  beforeEach(() => {
    process.env.SESSION_MANAGER_ENABLED = 'true';
  });

  it('logs in and issues a session-tracked access token', async () => {
    const app = buildApp();
    const res = await login(app);

    expect(res.status).toBe(200);
    const token = res.body?.data?.accessToken;
    expect(typeof token).toBe('string');
    expect(SessionManager.getInstance().getStore().hasToken(token)).toBe(true);
  });

  it('rotates the access token via /rotate and invalidates the old one', async () => {
    const app = buildApp();
    const res = await login(app);
    const oldToken = res.body?.data?.accessToken;

    const rotate = await request(app)
      .post('/api/auth/rotate')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(rotate.status).toBe(200);
    const newToken = rotate.body?.data?.accessToken;
    expect(typeof newToken).toBe('string');
    expect(newToken).not.toBe(oldToken);

    const store = SessionManager.getInstance().getStore();
    expect(store.hasToken(newToken)).toBe(true);
    expect(store.hasToken(oldToken)).toBe(false);
  });

  it('rejects /rotate with no bearer token', async () => {
    const app = buildApp();
    const rotate = await request(app).post('/api/auth/rotate');
    // authenticate middleware blocks unauthenticated requests before /rotate body runs.
    expect([401, 403]).toContain(rotate.status);
  });

  it('logout invalidates the session-tracked access token', async () => {
    const app = buildApp();
    const res = await login(app);
    const token = res.body?.data?.accessToken;
    const refreshToken = res.body?.data?.refreshToken;

    expect(SessionManager.getInstance().getStore().hasToken(token)).toBe(true);

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken });

    expect(logout.status).toBe(200);
    expect(SessionManager.getInstance().getStore().hasToken(token)).toBe(false);
  });
});
