import request from 'supertest';
import { getMockAuthManager } from '../../helpers/authMocks';
import { createAuthApp, createAuthToken } from '../../helpers/authTestApp';

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

// Mock rateLimiter (no-op)
jest.mock('../../../src/middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  defaultRateLimiter: (_req: any, _res: any, next: any) => next(),
  configRateLimiter: (_req: any, _res: any, next: any) => next(),
  adminRateLimiter: (_req: any, _res: any, next: any) => next(),
  apiRateLimiter: (_req: any, _res: any, next: any) => next(),
  applyRateLimiting: (_req: any, _res: any, next: any) => next(),
}));

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user' as const,
  isActive: true,
  createdAt: new Date().toISOString(),
  lastLogin: null,
};

describe('POST /auth/verify', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and user when token is valid and user exists', async () => {
    const decoded = { userId: 'user-123', username: 'testuser', role: 'user' };
    mockAuthManager.verifyAccessToken.mockReturnValue(decoded);
    mockAuthManager.getUser.mockReturnValue(mockUser);

    const res = await request(app).post('/auth/verify').send({ token: 'valid-access-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe('user-123');
    // Assert verifyAccessToken was called with the exact token
    expect(mockAuthManager.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
    expect(mockAuthManager.verifyAccessToken).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when verifyAccessToken throws (invalid token)', async () => {
    mockAuthManager.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const res = await request(app).post('/auth/verify').send({ token: 'bad-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when token is valid but user does not exist', async () => {
    const decoded = { userId: 'ghost-user', username: 'ghost', role: 'user' };
    mockAuthManager.verifyAccessToken.mockReturnValue(decoded);
    mockAuthManager.getUser.mockReturnValue(null);

    const res = await request(app).post('/auth/verify').send({ token: 'valid-token-no-user' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/user not found/i);
  });

  it('returns 400 with VALIDATION_ERROR when token field is missing', async () => {
    const res = await request(app).post('/auth/verify').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockAuthManager.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('returns 400 with VALIDATION_ERROR when token is an empty string', async () => {
    const res = await request(app).post('/auth/verify').send({ token: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockAuthManager.verifyAccessToken).not.toHaveBeenCalled();
  });
});

describe('GET /auth/verify', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with tokenValid === true for a valid Bearer token', async () => {
    const token = createAuthToken({ id: 'user1', username: 'user1', role: 'user' });
    const decoded = {
      userId: 'user1',
      username: 'user1',
      role: 'user',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    mockAuthManager.verifyAccessToken.mockReturnValue(decoded);
    mockAuthManager.getUser.mockReturnValue(mockUser);

    const res = await request(app).get('/auth/verify').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe('testuser');
    expect(mockAuthManager.verifyAccessToken).toHaveBeenCalledWith(token);
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/auth/verify');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/No token provided/i);
    expect(mockAuthManager.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is invalid (verifyAccessToken throws)', async () => {
    mockAuthManager.verifyAccessToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when token is valid but getUser returns null', async () => {
    const decoded = { userId: 'missing-user', username: 'missing', role: 'user' };
    mockAuthManager.verifyAccessToken.mockReturnValue(decoded);
    mockAuthManager.getUser.mockReturnValue(null);

    const res = await request(app)
      .get('/auth/verify')
      .set('Authorization', 'Bearer some-valid-looking-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/user not found/i);
  });
});
