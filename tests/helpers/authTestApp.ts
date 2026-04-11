import express from 'express';
import jwt from 'jsonwebtoken';
import authRouter from '../../src/server/routes/auth';
import { globalErrorHandler } from '../../src/middleware/errorHandler';

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
