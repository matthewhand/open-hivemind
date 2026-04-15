import request from 'supertest';
import { createAuthApp } from '../../helpers/authTestApp';

// -----------------------------------------------------------------------
// The mock factory is hoisted by Babel/Jest before any `const` declarations
// in this file, so we cannot reference a `const mockAuthManager` declared
// outside the factory (TDZ error). Instead we keep the singleton inside the
// factory closure and expose it via AuthManager.getInstance().
// -----------------------------------------------------------------------
jest.mock('../../../src/auth/AuthManager', () => {
  const singleton = {
    login: jest.fn(),
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
  return {
    AuthManager: {
      getInstance: jest.fn(() => singleton),
    },
  };
});

// Mock rateLimiter middleware to bypass rate limiting in these trusted-IP tests
jest.mock('../../../src/middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  apiRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Obtain the mock singleton that the factory created

const { AuthManager } = require('../../../src/auth/AuthManager');
const mockAuthManager = AuthManager.getInstance() as ReturnType<
  typeof import('../../helpers/authMocks').getMockAuthManager
>;

describe('GET /auth/trusted-status', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns trusted=true when ALLOW_LOCALHOST_ADMIN=true (supertest connects from localhost)', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';
    delete process.env.ADMIN_IP_WHITELIST;

    const res = await request(app).get('/auth/trusted-status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.trusted).toBe(true);
  });

  it('returns trusted=false when ALLOW_LOCALHOST_ADMIN=false', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'false';
    delete process.env.ADMIN_IP_WHITELIST;

    const res = await request(app).get('/auth/trusted-status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.trusted).toBe(false);
  });
});

describe('POST /auth/trusted-login', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ALLOW_LOCALHOST_ADMIN;
    delete process.env.ADMIN_IP_WHITELIST;
  });

  it('returns 200 with tokens when ALLOW_LOCALHOST_ADMIN=true and no username provided', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';

    const fakeAuthResult = {
      accessToken: 'trusted-access-token',
      refreshToken: 'trusted-refresh-token',
      user: { id: 'admin-id', username: 'admin', role: 'admin' },
    };
    mockAuthManager.trustedLogin.mockResolvedValueOnce(fakeAuthResult);

    const res = await request(app)
      .post('/auth/trusted-login')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('trusted-access-token');
    expect(res.body.data.refreshToken).toBe('trusted-refresh-token');
    expect(mockAuthManager.trustedLogin).toHaveBeenCalledWith('admin');
  });

  it('calls trustedLogin with explicit username when provided', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';

    const fakeAuthResult = {
      accessToken: 'explicit-access-token',
      refreshToken: 'explicit-refresh-token',
      user: { id: 'admin-id', username: 'admin', role: 'admin' },
    };
    mockAuthManager.trustedLogin.mockResolvedValueOnce(fakeAuthResult);

    const res = await request(app)
      .post('/auth/trusted-login')
      .send({ username: 'admin' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockAuthManager.trustedLogin).toHaveBeenCalledWith('admin');
  });

  it('returns 403 and does NOT call trustedLogin when ALLOW_LOCALHOST_ADMIN=false', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'false';

    const res = await request(app)
      .post('/auth/trusted-login')
      .send({ username: 'admin' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    // Key verification: trustedLogin must NOT be invoked for untrusted IPs
    expect(mockAuthManager.trustedLogin).not.toHaveBeenCalled();
  });

  it('returns 401 when trustedLogin throws an error', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';

    mockAuthManager.trustedLogin.mockRejectedValueOnce(new Error('User not found'));

    const res = await request(app)
      .post('/auth/trusted-login')
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('uses "admin" as the default username when body is empty', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';

    const fakeAuthResult = {
      accessToken: 'default-admin-token',
      refreshToken: 'default-refresh-token',
      user: { id: 'admin-id', username: 'admin', role: 'admin' },
    };
    mockAuthManager.trustedLogin.mockResolvedValueOnce(fakeAuthResult);

    const res = await request(app).post('/auth/trusted-login').send({});

    expect(res.status).toBe(200);
    expect(mockAuthManager.trustedLogin).toHaveBeenCalledWith('admin');
  });
});
