import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { AuthManager } from './AuthManager';
import type { AuthMiddlewareRequest, User, UserRole } from './types';

// Canonical declaration of `req.user` for plain Express handlers.
// Inherited from the former src/server/middleware/auth.ts when the two
// parallel auth middlewares were consolidated — many route handlers access
// `req.user` on the un-cast Request type.
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface TokenPayload {
  userId: string;
  role?: string;
  permissions?: string[];
  [key: string]: unknown;
}

const debug = Debug('app:AuthMiddleware');

/**
 * Fake admin user injected when the E2E test bypass is enabled
 * (ALLOW_TEST_BYPASS=true — refused outright in production).
 * Mirrors the user formerly injected by src/server/middleware/auth.ts so
 * Playwright E2E flows keep working after consolidation.
 */
const TEST_BYPASS_USER: User = {
  id: 'test-admin',
  username: 'admin',
  email: 'test@open-hivemind.local',
  role: 'admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
};

export class AuthMiddleware {
  private static instance: AuthMiddleware;
  private authManager: AuthManager;

  private constructor() {
    this.authManager = AuthManager.getInstance();
  }

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  /**
   * JWT Authentication middleware
   * Verifies JWT token and attaches user to request.
   *
   * Bypass flags (both opt-in, both refused/ineffective in production):
   *   - ALLOW_TEST_BYPASS=true  — E2E test bypass; any request is treated as
   *     admin. Hard-refused (HTTP 500) when NODE_ENV=production.
   *   - ALLOW_LOCALHOST_ADMIN=true — requests from a strictly validated
   *     localhost origin are treated as admin when no valid token is supplied.
   *
   * Failure responses are explicit JSON with RFC-conventional status codes:
   *   401 — missing/invalid/expired token, or token for a nonexistent user.
   */
  public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // ── E2E test bypass (formerly src/server/middleware/auth.ts) ──
    // Activate by setting ALLOW_TEST_BYPASS=true (never in production).
    if (process.env.ALLOW_TEST_BYPASS === 'true') {
      if (process.env.NODE_ENV === 'production') {
        // Defense-in-depth: refuse to bypass if a hostile env reaches us.
        res.status(500).json({
          error: 'Server misconfiguration: ALLOW_TEST_BYPASS cannot be used in production',
        });
        return;
      }
      (req as AuthMiddlewareRequest).user = TEST_BYPASS_USER;
      (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(
        TEST_BYPASS_USER.role
      );
      next();
      return;
    }

    // Helper to check for localhost
    const isLocalhostRequest = (): boolean => {
      const clientIP = req.ip ?? req.connection?.remoteAddress ?? req.socket?.remoteAddress ?? '';
      const host = req.get('host');
      const origin = req.get('origin');

      const isLocalhostIp =
        clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';

      // Strict check for host header to prevent host header injection
      // Includes IPv6 loopback variants for comprehensive protection
      const isLocalhostHost =
        host &&
        (host === 'localhost' ||
          host.startsWith('localhost:') ||
          host === '127.0.0.1' ||
          host.startsWith('127.0.0.1:') ||
          host === '[::1]' ||
          host.startsWith('[::1]:') ||
          host === '[0:0:0:0:0:0:0:1]' ||
          host.startsWith('[0:0:0:0:0:0:0:1]:'));

      // Strict check for origin header
      // Includes IPv6 loopback variants for comprehensive protection
      const isLocalhostOrigin =
        origin &&
        (origin === 'http://localhost' ||
          origin.startsWith('http://localhost:') ||
          origin === 'https://localhost' ||
          origin.startsWith('https://localhost:') ||
          origin === 'http://127.0.0.1' ||
          origin.startsWith('http://127.0.0.1:') ||
          origin === 'https://127.0.0.1' ||
          origin.startsWith('https://127.0.0.1:') ||
          origin === 'http://[::1]' ||
          origin.startsWith('http://[::1]:') ||
          origin === 'https://[::1]' ||
          origin.startsWith('https://[::1]:'));

      // SECURITY: Must strictly be a localhost IP AND have matching headers if provided.
      // This prevents Authorization Bypass via Host Header Spoofing where an external
      // request could spoof `Host: localhost` or `Origin: localhost` and bypass auth.
      // We use strict AND logic rather than OR logic across these validation dimensions.

      if (!isLocalhostIp) {
        debug('SECURITY: Non-localhost IP attempted bypass: %s', clientIP);
        return false;
      }

      // If Host or Origin headers are provided, they must also be localhost
      // to protect against DNS rebinding and CSRF spoofing.
      if (host && !isLocalhostHost) {
        debug('SECURITY: Localhost IP with non-localhost Host header: %s from %s', host, clientIP);
        return false;
      }
      if (origin && !isLocalhostOrigin) {
        debug(
          'SECURITY: Localhost IP with non-localhost Origin header: %s from %s',
          origin,
          clientIP
        );
        return false;
      }

      return true;
    };

    const allowLocalBypass = process.env.ALLOW_LOCALHOST_ADMIN === 'true';
    const isLocalhost = isLocalhostRequest();

    const bypassAuth = (): void => {
      debug(`Bypassing authentication for localhost request: ${req.method} ${req.path}`);
      // Create a default admin user for localhost access
      const defaultUser: User = {
        id: 'localhost-admin',
        username: 'localhost-admin',
        email: 'admin@localhost',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      (req as AuthMiddlewareRequest).user = defaultUser;
      (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(
        defaultUser.role
      );
      next();
    };

    try {
      const authHeader = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization;

      if ((!authHeader || !authHeader.startsWith('Bearer ')) && isLocalhost && allowLocalBypass) {
        bypassAuth();
        return;
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Explicit 401 JSON — preserves the response contract of the former
        // src/server/middleware/auth.ts (no global error handler is mounted,
        // so next(err) would render Express's default HTML error page).
        res.status(401).json({ error: 'Access token required' });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = this.authManager.verifyAccessToken(token) as TokenPayload;

      // Get user from token payload. A valid token whose user has been
      // deleted or deactivated is rejected — deliberately the same generic
      // message as an invalid token to avoid user enumeration.
      const user = this.authManager.getUser(payload.userId);
      if (!user) {
        debug('Token valid but user %s not found', payload.userId);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      if (user.isActive === false) {
        debug('Token valid but user %s is inactive', payload.userId);
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const userWithTenant = user;

      // Attach user and permissions derived from the *live* role, not the JWT
      // claim. JWT permissions can be stale after demotion/elevation until
      // token expiry; requirePermission must see the current role.
      (req as AuthMiddlewareRequest).user = userWithTenant;
      (req as AuthMiddlewareRequest).permissions = this.authManager.getUserPermissions(user.role);

      debug(`Authenticated user: ${user.username} (role: ${user.role})`);
      next();
    } catch (error) {
      // If validation fails BUT we are localhost and allow bypass, proceed as admin
      if (isLocalhost && allowLocalBypass) {
        debug('Authentication failed but localhost bypass is active. Proceeding as admin.');
        bypassAuth();
        return;
      }

      debug('Authentication error:', error);
      // 401 (not the former 403 of src/server/middleware/auth.ts): an
      // invalid/expired token is an authentication failure per RFC 6750.
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  /**
   * Role-based authorization middleware
   * Checks if user has required role (hierarchical: a higher role always
   * satisfies a lower requirement — admin passes every check).
   */
  public requireRole = (
    requiredRole: string
  ): ((req: Request, res: Response, next: NextFunction) => void) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthMiddlewareRequest;
      if (!authReq.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        user: 2,
        'bot-manager': 3,
        admin: 4,
      };

      const userRoleLevel = roleHierarchy[authReq.user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        res.status(403).json({
          error: 'Insufficient role',
          required: requiredRole,
          userRole: authReq.user.role,
        });
        return;
      }

      debug(
        `Role check passed: ${authReq.user.username} has max level ${userRoleLevel} >= ${requiredRoleLevel} for ${requiredRole}`
      );
      next();
    };
  };

  /**
   * Permission-based authorization middleware
   * Checks if user has specific permission
   */
  public requirePermission = (
    permission: string
  ): ((req: Request, res: Response, next: NextFunction) => void) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authReq = req as AuthMiddlewareRequest;
      if (!authReq.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!authReq.permissions?.includes(permission)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
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
   * Attaches user to request if a valid token is present, but doesn't fail if
   * missing. Does NOT clobber a `req.user` set by upstream middleware
   * (preserves the semantics of the former src/server/middleware/auth.ts
   * optionalAuth, whose consumers were migrated here).
   */
  public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthMiddlewareRequest;

    try {
      const authHeader = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = this.authManager.verifyAccessToken(token) as TokenPayload;
        const user = this.authManager.getUser(payload.userId);

        // Only attach active users; inactive accounts are treated as unauthenticated.
        if (user && user.isActive !== false) {
          authReq.user = user;
          // Live role permissions (not JWT payload) — same as authenticate.
          authReq.permissions = this.authManager.getUserPermissions(user.role);
          debug(`Optional auth: authenticated user ${user.username}`);
        } else if (user && user.isActive === false) {
          debug('Optional auth: ignoring inactive user %s', payload.userId);
        }
      }
    } catch (error) {
      // Silently ignore auth errors for optional auth
      debug('Optional auth error:', error);
    }

    next();
  };
}

// Create middleware functions that use singleton AuthMiddleware instance
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return AuthMiddleware.getInstance().authenticate(req, res, next);
};

export const requireRole = (
  requiredRole: UserRole
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return AuthMiddleware.getInstance().requireRole(requiredRole);
};

export const requirePermission = (
  permission: string
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return AuthMiddleware.getInstance().requirePermission(permission);
};

export const requireAdmin = AuthMiddleware.getInstance().requireAdmin;

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  return AuthMiddleware.getInstance().optionalAuth(req, res, next);
};

/**
 * Whether tenant isolation is active.
 *
 * Opt-in via env: `TENANT_ISOLATION_ENABLED=true` or `MULTI_TENANT_ENABLED=true`.
 * When disabled (default), {@link requireTenant} is a no-op aside from optional
 * header capture — it is **not** a security boundary in that mode.
 */
export function isTenantIsolationEnabled(): boolean {
  const raw = process.env.TENANT_ISOLATION_ENABLED ?? process.env.MULTI_TENANT_ENABLED ?? 'false';
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

/**
 * Resolve a tenant id from the request (header / query / authenticated user).
 * Does not validate that the tenant exists — only extracts an identifier.
 */
export function resolveTenantId(req: Request): string | undefined {
  const header =
    (req.headers['x-tenant-id'] as string | undefined) ||
    (req.headers['x-tenant'] as string | undefined);
  if (header && String(header).trim()) {
    return String(header).trim();
  }

  const q =
    (req.query as { tenantId?: string; tenant?: string } | undefined)?.tenantId ??
    (req.query as { tenant?: string } | undefined)?.tenant;
  if (q && String(q).trim()) {
    return String(q).trim();
  }

  const user = (req as Request & { user?: { tenantId?: string } }).user;
  if (user?.tenantId && String(user.tenantId).trim()) {
    return String(user.tenantId).trim();
  }

  return undefined;
}

/**
 * Tenant middleware.
 *
 * When tenant isolation is **enabled** (`TENANT_ISOLATION_ENABLED` /
 * `MULTI_TENANT_ENABLED`), every request must supply a tenant id via
 * `X-Tenant-Id` / `X-Tenant` header, `?tenantId=` query, or the authenticated
 * user's `tenantId`. Missing ids → 400.
 *
 * When isolation is **disabled** (default), the middleware still attaches a
 * tenant id when present but never rejects — it is **not** a security control
 * in single-tenant deployments.
 *
 * Attaches `req.tenantId` for downstream handlers when resolved.
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = resolveTenantId(req);
  if (tenantId) {
    (req as Request & { tenantId?: string }).tenantId = tenantId;
  }

  if (!isTenantIsolationEnabled()) {
    next();
    return;
  }

  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: 'Tenant id required',
      code: 'TENANT_REQUIRED',
      message:
        'Tenant isolation is enabled. Provide X-Tenant-Id (or X-Tenant) header, tenantId query param, or authenticate as a user with tenantId.',
    });
    return;
  }

  next();
};
