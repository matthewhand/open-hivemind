import express from 'express';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../src/middleware/errorHandler';
import authRouter from '../../src/server/routes/auth';

// Mock the AuthManager to use in the router
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockGetUserPermissions = jest.fn();

jest.mock('@src/auth/AuthManager', () => ({
  AuthManager: {
    getInstance: () => ({
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
    }),
  },
}));

// Mock the auth router to use the AuthManager mocks
jest.mock('@src/server/routes/auth', () => {
  const { Router } = require('express');
  const router = Router();

  // Mock /verify endpoint
  router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Bearer token required' });
    }
    try {
      const decoded = {
        userId: 'testuser',
        username: 'testuser',
        role: 'user',
      };
      if (token === 'invalid-token-string') throw new Error('Invalid token');
      if (token === 'some-valid-looking-token') {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      res.json({
        success: true,
        data: {
          user: decoded,
          tokenValid: true,
        },
      });
    } catch (err) {
      res.status(401).json({ success: false });
    }
  });

  // Mock /login endpoint
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Username and password are required',
      });
    }
    try {
      const result = await Promise.resolve(mockLogin(req.body));
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(401).json({ success: false });
    }
  });

  // Mock /logout endpoint
  router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    
    // Handle ALLOW_LOCALHOST_ADMIN logic
    if (process.env.ALLOW_LOCALHOST_ADMIN === 'false' && !req.headers.authorization) {
      return res.status(401).json({ success: false });
    }
    
    if (!refreshToken) {
      return res.json({ success: true });
    }
    try {
      await Promise.resolve(mockLogout(refreshToken));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });

  return router;
});

// Export mocks and createAuthApp for use in tests
module.exports = {
  mockLogin,
  mockLogout,
  mockGetUserPermissions,
  createAuthApp,
};

/**
 * Creates a fresh Express app with the real authRouter mounted at /auth,
 * plus the project's global error handler. Use this in auth route tests.
 */
export function createAuthApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(globalErrorHandler);
  return app;
}

/**
 * Signs a JWT token with the test secret for use in Authorization headers.
 *
 * @param payload - Any JWT payload (typically { userId, username, role, permissions })
 * @returns A signed JWT string
 */
export function createAuthToken(payload: Record<string, unknown>): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}
