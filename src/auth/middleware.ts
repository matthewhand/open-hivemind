import { Request, Response, NextFunction } from 'express';
import { AuthManager } from './AuthManager';
import { AuthMiddlewareRequest, UserRole } from './types';
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
   */
  public authenticate = async (req: AuthMiddlewareRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = (req.headers as any).authorization;

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
      req.user = user;
      req.permissions = payload.permissions;

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
    return (req: AuthMiddlewareRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
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

      const userRoleLevel = roleHierarchy[req.user.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${requiredRole}, your role: ${req.user.role}`
        });
        return;
      }

      debug(`Role check passed: ${req.user.username} has ${req.user.role} >= ${requiredRole}`);
      next();
    };
  };

  /**
   * Permission-based authorization middleware
   * Checks if user has specific permission
   */
  public requirePermission = (permission: string) => {
    return (req: AuthMiddlewareRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }

      if (!req.permissions || !req.permissions.includes(permission)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required permission: ${permission}`
        });
        return;
      }

      debug(`Permission check passed: ${req.user.username} has ${permission}`);
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
  public optionalAuth = async (req: AuthMiddlewareRequest, res: Response, next: NextFunction): Promise<void> => {
    // Initialize user as undefined
    req.user = undefined;
    req.permissions = undefined;
    
    try {
      const authHeader = (req.headers as any).authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = this.authManager.verifyAccessToken(token);
        const user = this.authManager.getUser(payload.userId);

        if (user) {
          req.user = user;
          req.permissions = payload.permissions;
          debug(`Optional auth: authenticated user ${user.username}`);
        }
      }
    } catch (error) {
      // Silently ignore auth errors for optional auth
      debug('Optional auth failed, continuing without authentication');
    }

    next();
  };
}

// Create middleware functions that get fresh AuthManager instance
export const authenticate = async (req: AuthMiddlewareRequest, res: Response, next: NextFunction): Promise<void> => {
  const authManager = AuthManager.getInstance();
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

export const optionalAuth = async (req: AuthMiddlewareRequest, res: Response, next: NextFunction): Promise<void> => {
  const middleware = new AuthMiddleware();
  return middleware.optionalAuth(req, res, next);
};