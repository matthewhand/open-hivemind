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

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let payload;
  try {
    const authManager = AuthManager.getInstance();
    payload = authManager.verifyAccessToken(token);
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authManager = AuthManager.getInstance();
    const user = authManager.getUser(req.user.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!authManager.hasPermission(user.role, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        userRole: user.role,
      });
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: 'Insufficient role',
        required: role,
        userRole: req.user.role,
      });
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
