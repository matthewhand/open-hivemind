import { Request, Response, NextFunction } from 'express';
import { AuthManager } from '../../auth/AuthManager';
import { ConfigurationManager } from '../../config/ConfigurationManager';
import { isIpWhitelisted } from '../../common/ipUtils';
import Debug from 'debug';

const debug = Debug('app:auth:middleware');

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Check IP Whitelist
  try {
    const configManager = ConfigurationManager.getInstance();
    const environmentConfig = configManager.getConfig('environment');
    const whitelist = environmentConfig ? environmentConfig.get('AUTH_IP_WHITELIST') : '';

    if (whitelist) {
      const clientIp = req.ip || req.socket.remoteAddress || '';
      // Handle x-forwarded-for if strictly needed, but let's stick to basics or req.ip if express
      // Note: req.ip requires 'trust proxy' setting for forwarded IPs.

      if (isIpWhitelisted(clientIp, whitelist.split(','))) {
        debug(`Bypassing auth for whitelisted IP: ${clientIp}`);
        // Create a privileged system user session
        req.user = {
          userId: 'system-whitelist',
          username: 'System (IP Whitelisted)',
          role: 'admin',
          permissions: AuthManager.getInstance().getUserPermissions('admin') // Admin has all permissions
        };
        return next();
      }
    }
  } catch (error) {
    debug('Error checking IP whitelist:', error);
    // Continue to normal auth on error
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const authManager = AuthManager.getInstance();
  const payload = authManager.verifyAccessToken(token);

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
        userRole: user.role
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
        userRole: req.user.role
      });
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const authManager = AuthManager.getInstance();
    const payload = authManager.verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
};