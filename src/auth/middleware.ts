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
      const authHeader = (req.headers as any).authorization;

      // Check if request is from localhost - bypass authentication when no auth header provided
      const clientIP = (req as any).ip || (req as any).connection?.remoteAddress ||
                      (req as any).socket?.remoteAddress ||
                      '';

      // Check for localhost IPs and common localhost hostnames
      const isLocalhost = clientIP === '127.0.0.1' ||
                         clientIP === '::1' ||
                         clientIP === '::ffff:127.0.0.1' ||
                         (req as any).hostname === 'localhost' ||
                         (req as any).hostname === '127.0.0.1' ||
                         ((req as any).headers?.host && (req as any).headers.host.includes('localhost')) ||
                         ((req as any).headers?.origin && (req as any).headers.origin.includes('localhost'));

      const allowLocalBypass = process.env.ALLOW_LOCALHOST_ADMIN === 'true';

      if ((!authHeader || !authHeader.startsWith('Bearer ')) && isLocalhost && allowLocalBypass) {
        debug(`Bypassing authentication for localhost request: ${req.method} ${req.path} from ${clientIP}`);
        // Create a default admin user for localhost access
        const defaultUser: User = {
          id: 'localhost-admin',
          username: 'localhost-admin',
          email: 'admin@localhost',
          role: 'admin' as const,
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

      // Attach user and permissions to request
      (req as AuthMiddlewareRequest).user = user;
      (req as AuthMiddlewareRequest).permissions = payload.permissions;

      debug(`Authenticated user: ${user.username} (${user.role})`);
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
  public requireRole = (requiredRole: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthMiddlewareRequest;
      if (!authReq.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }

      const roleHierarchy: Record<UserRole, number> = {
        viewer: 1,
        user: 2,
        admin: 3
      };

      const userRoleLevel = roleHierarchy[authReq.user.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${requiredRole}, your role: ${req.user.role}`
        });
        return;
      }

      debug(`Role check passed: ${authReq.user.username} has ${authReq.user.role} >= ${requiredRole}`);
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

      if (!authReq.permissions || !authReq.permissions.includes(permission)) {
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
      const authHeader = (req.headers as any).authorization;

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
    } catch {
      // Silently ignore auth errors for optional auth
      debug('Optional auth failed, continuing without authentication');
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
