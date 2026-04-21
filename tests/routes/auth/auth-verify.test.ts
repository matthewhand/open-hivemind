import request from 'supertest';
import { createAuthApp } from '../../helpers/authTestApp';

describe('GET /auth/verify', () => {
  let app: any;

  beforeAll(() => {
    app = createAuthApp();
  });

  it('returns 200 with tokenValid === true for a valid Bearer token', async () => {
    const token = 'valid-token';
    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe('testuser');
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/auth/verify');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Bearer token required/i);
  });

  it('returns 401 when Bearer token is invalid (verifyAccessToken throws)', async () => {
    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when token is valid but getUser returns null', async () => {
    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', 'Bearer some-valid-looking-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/user not found/i);
  });
});