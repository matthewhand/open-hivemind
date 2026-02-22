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

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
};

export const requirePermission = (permission: string) => {
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

    next();
  };
};

export const requireRole = (role: string) => {
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

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const authManager = AuthManager.getInstance();
      const payload = authManager.verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    } catch (e) {
      // Ignore invalid tokens in optional auth
    }
  }

  next();
};
