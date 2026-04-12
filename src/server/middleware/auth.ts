import type { NextFunction, Request, Response } from 'express';
import { AuthManager } from '../../auth/AuthManager';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Fake admin user injected when test bypass is enabled.
 * Used by Playwright E2E tests to skip real auth verification.
 */
const TEST_BYPASS_USER = {
  id: 'test-admin',
  username: 'admin',
  email: 'test@open-hivemind.local',
  role: 'owner',
  permissions: ['*'],
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  // Server-side auth bypass for E2E testing.
  // Activate by setting ALLOW_TEST_BYPASS=true (never in production).
  // When enabled, any request is treated as an authenticated admin request.
  if (process.env.ALLOW_TEST_BYPASS === 'true') {
    req.user = TEST_BYPASS_USER;
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  let payload;
  try {
    const authManager = AuthManager.getInstance();
    payload = authManager.verifyAccessToken(token);
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  return next();
};

export const requirePermission = (
  permission: string
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const authManager = AuthManager.getInstance();
    const user = authManager.getUser(req.user.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (!authManager.hasPermission(user.role, permission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        userRole: user.role,
      });
      return;
    }

    return next();
  };
};

export const requireRole = (
  role: string
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        error: 'Insufficient role',
        required: role,
        userRole: req.user.role,
      });
      return;
    }

    return next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const authManager = AuthManager.getInstance();
      const payload = authManager.verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    } catch {
      // Ignore invalid tokens in optional auth
    }
  }

  return next();
};
