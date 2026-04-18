import request from 'supertest';
import { getMockAuthManager } from '../../helpers/authMocks';
import { createAuthApp } from '../../helpers/authTestApp';

// Mock AuthManager singleton at file level.
// jest.mock factories are hoisted before all variable declarations, so we use
// jest.requireMock() after the factory runs to retrieve the mock instance.
jest.mock('../../../src/auth/AuthManager', () => {
  const { getMockAuthManager: make } = jest.requireActual('../../helpers/authMocks');
  const instance = make();
  return {
    AuthManager: {
      getInstance: jest.fn(() => instance),
      _mockInstance: instance, // stash so we can retrieve it below
    },
  };
});

// Retrieve the mock instance that the factory created above
const mockAuthManager = (
  jest.requireMock('../../../src/auth/AuthManager') as {
    AuthManager: { _mockInstance: ReturnType<typeof getMockAuthManager> };
  }
).AuthManager._mockInstance;

// Mock rateLimiter (no-op) — rate limiter already skips in NODE_ENV=test,
// but mock the module to guarantee no side-effects.
jest.mock('../../../src/middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  defaultRateLimiter: (_req: any, _res: any, next: any) => next(),
  configRateLimiter: (_req: any, _res: any, next: any) => next(),
  adminRateLimiter: (_req: any, _res: any, next: any) => next(),
  apiRateLimiter: (_req: any, _res: any, next: any) => next(),
  applyRateLimiting: (_req: any, _res: any, next: any) => next(),
}));

describe('POST /auth/refresh', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and accessToken when refreshToken is valid', async () => {
    const tokenSet = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    };
    mockAuthManager.refreshToken.mockResolvedValue(tokenSet);

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'valid-rtok' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('new-access-token');
    // Assert mock was called with the exact token
    expect(mockAuthManager.refreshToken).toHaveBeenCalledWith('valid-rtok');
    expect(mockAuthManager.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when refreshToken is invalid or expired', async () => {
    mockAuthManager.refreshToken.mockRejectedValue(new Error('Token expired'));

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/token expired/i);
  });

  it('returns 400 with VALIDATION_ERROR when refreshToken field is missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockAuthManager.refreshToken).not.toHaveBeenCalled();
  });

  it('returns 400 with VALIDATION_ERROR when refreshToken is an empty string', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockAuthManager.refreshToken).not.toHaveBeenCalled();
  });

  it('returns 200 and strips extra unexpected fields alongside a valid refreshToken', async () => {
    const tokenSet = {
      accessToken: 'stripped-access-token',
      refreshToken: 'stripped-refresh-token',
      expiresIn: 3600,
    };
    mockAuthManager.refreshToken.mockResolvedValue(tokenSet);

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'valid-rtok', extraField: 'should-be-stripped', another: 123 });

    // Zod strips extra fields by default — request should succeed
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('stripped-access-token');
    // refreshToken mock should have been called with just the token value
    expect(mockAuthManager.refreshToken).toHaveBeenCalledWith('valid-rtok');
  });

  it('returns 401 with a generic message when refreshToken throws a non-Error value', async () => {
    mockAuthManager.refreshToken.mockRejectedValue('string error');

    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'some-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
