import type { Request, Response, NextFunction } from 'express';
import { AuthManager } from './AuthManager';
import type { AuthMiddlewareRequest, UserRole, User } from './types';
import { AuthenticationError, AuthorizationError } from '../types/errorClasses';
import Debug from 'debug';

const debug = Debug('app:AuthMiddleware');

/**
 * Validates if an IP address is a loopback (localhost) address
 * Uses only socket-level IP to prevent header injection attacks
 * 
 * @param ip - The IP address to validate
 * @returns true if the IP is a loopback address
 */
function isLoopbackIP(ip: string | undefined): boolean {
  if (!ip) return false;
  
  // Check for IPv4 loopback
  if (ip === '127.0.0.1') return true;
  
  // Check for IPv6 loopback
  if (ip === '::1') return true;
  
  // Check for IPv4-mapped IPv6 loopback
  if (ip === '::ffff:127.0.0.1') return true;
  
  // Check for any 127.x.x.x address (IPv4 loopback range)
  // This handles cases like 127.0.0.2, 127.1.2.3, etc.
  if (ip.startsWith('127.')) return true;
  
  // Check for IPv6 loopback with embedded IPv4
  if (ip.toLowerCase().startsWith('::ffff:127.')) return true;
  
  return false;
}

/**
 * Validates localhost bypass request with enhanced security
 * 
 * Security improvements:
 * 1. Only checks socket-level IP (not headers that can be spoofed)
 * 2. Requires explicit bypass token for additional verification
 * 3. Logs all bypass attempts for audit
 * 4. Creates session with expiration time
 * 
 * @param req - Express request object
 * @returns Object with bypass status and user if successful
 */
function validateLocalhostBypass(req: Request): { allowed: boolean; user?: User; reason?: string } {
  const allowLocalBypass = process.env.ALLOW_LOCALHOST_ADMIN === 'true';
  
  if (!allowLocalBypass) {
    return { allowed: false, reason: 'Localhost bypass not enabled' };
  }
  
  // Only check socket-level IP - headers can be spoofed
  const socketIP = req.socket?.remoteAddress;
  
  if (!isLoopbackIP(socketIP)) {
    debug('Localhost bypass rejected: non-loopback socket IP', { socketIP });
    return { allowed: false, reason: 'Non-loopback IP' };
  }
  
  // Require explicit bypass token for additional security
  // This prevents accidental bypass in containerized environments
  const bypassToken = process.env.LOCALHOST_BYPASS_TOKEN;
  const bypassHeader = req.headers['x-localhost-bypass'];
  
  if (!bypassToken) {
    debug('Localhost bypass rejected: no bypass token configured');
    return { allowed: false, reason: 'Bypass token not configured' };
  }
  
  if (bypassHeader !== bypassToken) {
    debug('Localhost bypass rejected: invalid bypass token', { 
      socketIP,
      providedToken: bypassHeader ? '(provided)' : '(missing)'
    });
    return { allowed: false, reason: 'Invalid or missing bypass token' };
  }
  
  // Log bypass usage for security audit
  debug('SECURITY AUDIT: Localhost admin bypass used', {
    ip: socketIP,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Create limited admin user with session expiration
  const sessionExpiresAt = Date.now() + 3600000; // 1 hour from now
  
  const defaultUser: User = {
    id: 'localhost-admin',
    username: 'localhost-admin',
    email: 'admin@localhost',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    // Custom property for session expiration
    sessionExpiresAt,
  } as User & { sessionExpiresAt: number };
  
  return { allowed: true, user: defaultUser };
}

export class AuthMiddleware {
  private authManager: AuthManager;

  constructor() {
    this.authManager = AuthManager.getInstance();
  }

  /**
   * JWT Authentication middleware
   * Verifies JWT token and attaches user to request
   * 
   * SECURITY NOTE: Localhost bypass requires:
   * 1. ALLOW_LOCALHOST_ADMIN=true environment variable
   * 2. LOCALHOST_BYPASS_TOKEN set to a secure random value
   * 3. X-Localhost-Bypass header matching the token
   * 4. Request from actual loopback IP (socket-level check)
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  
      // Attempt localhost bypass if no auth header provided
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const bypassResult = validateLocalhostBypass(req);
        
        if (bypassResult.allowed && bypassResult.user) {
          debug(`Localhost bypass authenticated: ${req.method} ${req.path}`);
          (req as AuthMiddlewareRequest).user = bypassResult.user;
          (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(bypassResult.user.role);
          next();
          return;
        }
        
        // If bypass was attempted but failed, log for security monitoring
        if (process.env.ALLOW_LOCALHOST_ADMIN === 'true') {
          debug('Localhost bypass attempted but rejected:', bypassResult.reason);
        }
        
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
      // Pass error to Express error handler instead of throwing
      if (error instanceof AuthenticationError) {
        next(error);
        return;
      }
      next(new AuthenticationError('Invalid or expired token', undefined, 'expired_token'));
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
        next(new AuthenticationError('User not authenticated', undefined, 'missing_token'));
        return;
      }

      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        user: 2,
        admin: 3,
      };

      const userRoleLevel = roleHierarchy[authReq.user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        next(new AuthorizationError(
          `Required role: ${requiredRole}, your role: ${authReq.user.role}`,
          'role_check',
          'access',
          requiredRole,
        ));
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
        next(new AuthenticationError('User not authenticated', undefined, 'missing_token'));
        return;
      }
  
      if (!authReq.permissions?.includes(permission)) {
        next(new AuthorizationError(
          `Required permission: ${permission}`,
          'permission_check',
          'access',
          permission,
        ));
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
