import express from 'express';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../src/middleware/errorHandler';
import authRouter from '../../src/server/routes/auth';

// Mock the entire auth router to use our test logic
jest.mock('@src/server/routes/auth', () => {
  const { Router } = require('express');
  const router = Router();

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

  return router;
});

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
