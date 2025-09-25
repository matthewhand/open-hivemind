import { Request, Response, NextFunction } from 'express';
import { AuthManager } from './AuthManager';
import { AuthMiddlewareRequest, UserRole, User } from './types';
import Debug from 'debug';

const debug = Debug('app:AuthMiddleware');

export class AuthMiddleware {
  private authManager: AuthManager;

  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  /**
   * JWT Authentication middleware
   * Verifies JWT token and attaches user to request
   * Bypasses authentication for localhost requests
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  
      // Check if request is from localhost - bypass authentication when no auth header provided
      const clientIP = req.ip ?? req.connection?.remoteAddress ?? req.socket?.remoteAddress ?? '';
  
      // Check for localhost IPs and common localhost hostnames
      const host = req.get('host');
      const origin = req.get('origin');
      const isLocalhost = clientIP === '127.0.0.1' ||
                         clientIP === '::1' ||
                         clientIP === '::ffff:127.0.0.1' ||
                         host === 'localhost' ||
                         host === '127.0.0.1' ||
                         (host && host.includes('localhost')) ||
                         (origin && origin.includes('localhost'));
  
      const allowLocalBypass = process.env.ALLOW_LOCALHOST_ADMIN === 'true';
  
      if ((!authHeader || !authHeader.startsWith('Bearer ')) && isLocalhost && allowLocalBypass) {
        debug(`Bypassing authentication for localhost request: ${req.method} ${req.path} from ${clientIP}`);
        // Create a default admin user for localhost access
        const defaultUser: User = {
          id: 'localhost-admin',
          username: 'localhost-admin',
          email: 'admin@localhost',
          roles: ['admin'],
          tenantId: 'default',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        (req as AuthMiddlewareRequest).user = defaultUser;
        (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(defaultUser.roles);
        (req as AuthMiddlewareRequest).tenantId = 'default';
        (req as AuthMiddlewareRequest).roles = defaultUser.roles;
        next();
        return;
      }
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Bearer token required in Authorization header'
        });
        return;
      }
  
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = this.authManager.verifyAccessToken(token);
  
      // Get user from token payload
      const user = this.authManager.getUser(payload.userId);
      if (!user) {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'User not found'
        });
        return;
      }
  
      // Merge tenantId from payload if not in user
      const userWithTenant = { ...user, tenantId: payload.tenantId };
  
      // Attach user, permissions, and tenant to request
      (req as AuthMiddlewareRequest).user = userWithTenant;
      (req as AuthMiddlewareRequest).permissions = payload.permissions;
      (req as AuthMiddlewareRequest).tenantId = payload.tenantId;
  
      debug(`Authenticated user: ${user.username} (roles: ${user.roles.join(', ')})`);
      next();
    } catch (error) {
      debug('Authentication error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token'
      });
    }
  };

  /**
   * Role-based authorization middleware
   * Checks if user has required role
   */
  public requireRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthMiddlewareRequest;
      if (!authReq.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }

      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        user: 2,
        admin: 3
      };

      const userRoleLevel = Math.max(...authReq.user.roles.map(role => roleHierarchy[role] || 0));
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${requiredRole}, your roles: ${authReq.user.roles.join(', ')}`
        });
        return;
      }

      debug(`Role check passed: ${authReq.user.username} has max level ${userRoleLevel} >= ${requiredRoleLevel} for ${requiredRole}`);
      next();
    };
  };

  /**
   * Permission-based authorization middleware
   * Checks if user has specific permission
   */
  public requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthMiddlewareRequest;
      if (!authReq.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }
  
      if (!authReq.permissions?.includes(permission)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required permission: ${permission}`
        });
        return;
      }
  
      debug(`Permission check passed: ${authReq.user.username} has ${permission}`);
      next();
    };
  };

  /**
   * Admin-only middleware
   * Shortcut for requireRole('admin')
   */
  public requireAdmin = this.requireRole('admin');

  /**
   * Optional authentication middleware
   * Attaches user to request if token is present, but doesn't fail if missing
   */
  public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthMiddlewareRequest;
    // Initialize user as undefined
    authReq.user = undefined;
    authReq.permissions = undefined;
    
    try {
      const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = this.authManager.verifyAccessToken(token);
        const user = this.authManager.getUser(payload.userId);
  
        if (user) {
           const userWithTenant = { ...user, tenantId: payload.tenantId };
           authReq.user = userWithTenant;
           authReq.permissions = payload.permissions;
           authReq.tenantId = payload.tenantId;
           authReq.roles = payload.roles;
           debug(`Optional auth: authenticated user ${user.username}`);
         }
      }
    } catch (error) {
      // Silently ignore auth errors for optional auth
      debug('Optional auth error:', error);
    }
  
    next();
  };
}

// Create middleware functions that get fresh AuthManager instance
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const middleware = new AuthMiddleware();
  return middleware.authenticate(req, res, next);
};

export const requireRole = (requiredRole: UserRole) => {
  const middleware = new AuthMiddleware();
  return middleware.requireRole(requiredRole);
};

export const requirePermission = (permission: string) => {
  const middleware = new AuthMiddleware();
  return middleware.requirePermission(permission);
};

export const requireAdmin = (() => {
  const middleware = new AuthMiddleware();
  return middleware.requireAdmin;
})();

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const middleware = new AuthMiddleware();
  return middleware.optionalAuth(req, res, next);
};

/**
 * Tenant middleware - ensures tenant context is set and valid
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthMiddlewareRequest;
  if (!authReq.tenantId) {
    res.status(400).json({
      error: 'Tenant required',
      message: 'Tenant ID must be provided in authentication token'
    });
    return;
  }
  next();
};
