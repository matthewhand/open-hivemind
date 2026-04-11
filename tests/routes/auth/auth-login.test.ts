import request from 'supertest';
import { createAuthApp } from '../../helpers/authTestApp';

// Use `var` so the declaration is hoisted above the jest.mock factory calls.
// eslint-disable-next-line no-var
var mockLogin: jest.Mock;
// eslint-disable-next-line no-var
var mockLogout: jest.Mock;
// eslint-disable-next-line no-var
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

describe('POST /auth/login', () => {
  const app = createAuthApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with accessToken and user on valid credentials', async () => {
    const fakeAuthResult = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: { id: 'user-1', username: 'alice', role: 'user' },
    };
    mockLogin.mockResolvedValueOnce(fakeAuthResult);

    const credentials = { username: 'alice', password: 'secret123' };
    const res = await request(app)
      .post('/auth/login')
      .send(credentials)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBe('test-access-token');
    expect(res.body.data.user).toBeDefined();
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith(credentials);
  });

  it('returns 401 when AuthManager.login throws (wrong password)', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrong' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 validation error when password field is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns 400 validation error when username field is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'secret123' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns 400 validation error when body is empty', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('returns 401 when AuthManager.login throws an unexpected error', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Database connection failed'));

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'secret123' })
      .set('Content-Type', 'application/json');

    // The login handler catches all errors and returns 401
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
