import { Request, Response, NextFunction } from 'express';
import { AuthManager } from './AuthManager';
import { AuthMiddlewareRequest, UserRole, User } from './types';
import { AuthenticationError, AuthorizationError } from '../types/errorClasses';
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
          role: 'admin',
          // tenant_id: 'default',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        (req as AuthMiddlewareRequest).user = defaultUser;
        (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(defaultUser.role);
        next();
        return;
      }
  
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Bearer token required in Authorization header', undefined, 'missing_token');
      }
  
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = this.authManager.verifyAccessToken(token);
  
      // Get user from token payload
      const user = this.authManager.getUser(payload.userId);
      if (!user) {
        throw new AuthenticationError('User not found', undefined, 'invalid_credentials');
      }
  
      // Merge tenant_id from payload if not in user
      const userWithTenant = user;
  
      // Attach user, permissions, and tenant to request
      (req as AuthMiddlewareRequest).user = userWithTenant;
      (req as AuthMiddlewareRequest).permissions = payload.permissions;
      // req.tenant_id = payload.tenant_id;
  
      debug(`Authenticated user: ${user.username} (role: ${user.role})`);
      next();
    } catch (error) {
      debug('Authentication error:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid or expired token', undefined, 'expired_token');
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
        throw new AuthenticationError('User not authenticated', undefined, 'missing_token');
      }

      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        user: 2,
        admin: 3
      };

      const userRoleLevel = roleHierarchy[authReq.user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        throw new AuthorizationError(
          `Required role: ${requiredRole}, your role: ${authReq.user.role}`,
          'role_check',
          'access',
          requiredRole
        );
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
        throw new AuthenticationError('User not authenticated', undefined, 'missing_token');
      }
  
      if (!authReq.permissions?.includes(permission)) {
        throw new AuthorizationError(
          `Required permission: ${permission}`,
          'permission_check',
          'access',
          permission
        );
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
           authReq.user = user;
           authReq.permissions = payload.permissions;
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
  // Skip tenant validation for now - just pass through
  next();
};
