import type { NextFunction, Request, Response } from 'express';
import type { User } from '../../src/auth/types';

/**
 * Returns a mock object with all AuthManager instance methods stubbed as jest.fn().
 *
 * Methods covered are every method called by src/server/routes/auth.ts:
 *   login, register, refreshToken, logout, verifyAccessToken, getUser,
 *   getUserWithHash, verifyPassword, changePassword, getAllUsers,
 *   updateUser, deleteUser, getUserPermissions, trustedLogin, generateAccessToken
 */
export function getMockAuthManager() {
  return {
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
}

/**
 * Returns an Express middleware that sets req.user to the supplied user object
 * (defaulting to a test admin user) and calls next().
 *
 * Use this to replace the real `authenticate` / `requireAdmin` middlewares in
 * tests that need an authenticated request without a real JWT.
 */
export function mockAuthenticateMiddleware(user?: Partial<User>) {
  const defaultUser: User = {
    id: 'test-admin-id',
    username: 'test-admin',
    email: 'testadmin@localhost',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    ...user,
  };

  return (req: Request, _res: Response, next: NextFunction): void => {
    (req as Request & { user?: User }).user = defaultUser;
    next();
  };
}

/**
 * Returns a no-op rate-limiter middleware that immediately calls next().
 *
 * Drop this in when you need to bypass authRateLimiter in tests that run
 * outside the test environment (NODE_ENV !== 'test') or in supertest suites
 * where you want predictable behaviour regardless of rate-limit skip logic.
 */
export function mockRateLimiter() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}
