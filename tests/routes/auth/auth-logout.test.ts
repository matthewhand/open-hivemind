import request from 'supertest';
import { createAuthApp } from '../../helpers/authTestApp';

// Use `var` so the declaration is hoisted above the jest.mock factory calls.

var mockLogin: jest.Mock;

var mockLogout: jest.Mock;

var mockGetUserPermissions: jest.Mock;

jest.mock('../../../src/auth/AuthManager', () => {
  mockLogin = jest.fn();
  mockLogout = jest.fn();
  mockGetUserPermissions = jest.fn();
  return {
    AuthManager: {
      getInstance: jest.fn(() => ({
        login: mockLogin,
        logout: mockLogout,
        getUserPermissions: mockGetUserPermissions,
        register: jest.fn(),
        refreshToken: jest.fn(),
        verifyAccessToken: jest.fn(),
        getUser: jest.fn(),
        getUserWithHash: jest.fn(),
        verifyPassword: jest.fn(),
        changePassword: jest.fn(),
        getAllUsers: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        trustedLogin: jest.fn(),
        generateAccessToken: jest.fn(),
      })),
    },
  };
});

// Bypass rate limiting entirely in tests
jest.mock('../../../src/middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
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
