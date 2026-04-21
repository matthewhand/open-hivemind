import request from 'supertest';
import { createAuthApp } from '../../helpers/authTestApp';
import { mockLogin, mockLogout, mockGetUserPermissions } from '../../helpers/authTestApp';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Bypass rate limiting entirely in tests
jest.mock('../../../src/middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  apiRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

describe('POST /auth/logout', () => {
  const app = createAuthApp();

  beforeAll(() => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';
  });

  afterAll(() => {
    delete process.env.ALLOW_LOCALHOST_ADMIN;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and calls logout with refreshToken (localhost bypass active)', async () => {
    mockGetUserPermissions.mockReturnValueOnce([]);
    mockLogout.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'valid-rtok' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith('valid-rtok');
  });

  it('returns 200 and does not call logout when no refreshToken in body', async () => {
    mockGetUserPermissions.mockReturnValueOnce([]);

    const res = await request(app)
      .post('/auth/logout')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // No refreshToken provided — logout should not be called
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('returns 401 when ALLOW_LOCALHOST_ADMIN is false and no Authorization header is provided', async () => {
    // Temporarily disable localhost bypass to prove authenticate is real in the chain
    process.env.ALLOW_LOCALHOST_ADMIN = 'false';

    try {
      const res = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'some-token' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(401);
    } finally {
      // Always restore bypass for subsequent tests
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
    }
  });

  it('returns 500 when AuthManager.logout throws an error', async () => {
    mockGetUserPermissions.mockReturnValueOnce([]);
    mockLogout.mockRejectedValueOnce(new Error('Storage failure'));

    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'bad-token' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
