import crypto from 'crypto';
import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';

const debug = Debug('app:csrfMiddleware');

/**
 * CSRF Token Configuration
 */
interface CsrfConfig {
  /** Token length in bytes (default: 32) */
  tokenLength: number;
  /** Cookie name for CSRF token (default: '_csrf') */
  cookieName: string;
  /** Header name for CSRF token (default: 'x-csrf-token') */
  headerName: string;
  /** Token expiration time in milliseconds (default: 24 hours) */
  tokenExpiration: number;
}

const defaultConfig: CsrfConfig = {
  tokenLength: 32,
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  tokenExpiration: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * In-memory store for CSRF tokens
 * In production, this should be replaced with Redis or similar
 */
interface CsrfTokenEntry {
  token: string;
  createdAt: number;
  sessionId?: string;
}

// Global token store (use Redis in production)
const tokenStore = new Map<string, CsrfTokenEntry>();

/**
 * Clean up expired tokens periodically
 */
setInterval(
  () => {
    const now = Date.now();
    let expiredCount = 0;
    for (const [key, entry] of tokenStore.entries()) {
      if (now - entry.createdAt > defaultConfig.tokenExpiration) {
        tokenStore.delete(key);
        expiredCount++;
      }
    }
    if (expiredCount > 0) {
      debug('Cleaned up expired CSRF tokens:', expiredCount);
    }
  },
  60 * 60 * 1000
); // Clean up every hour

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(defaultConfig.tokenLength).toString('base64url');
}

/**
 * Get session identifier for token storage
 * Uses IP + User-Agent as a simple session identifier
 */
function getSessionId(req: Request): string {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
}

/**
 * Store CSRF token for session
 */
function storeToken(sessionId: string, token: string): void {
  tokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
    sessionId,
  });
}

/**
 * Validate CSRF token against stored token
 */
function validateToken(sessionId: string, providedToken: string): boolean {
  const entry = tokenStore.get(sessionId);

  if (!entry) {
    debug('CSRF token not found for session:', sessionId);
    return false;
  }

  // Check expiration
  if (Date.now() - entry.createdAt > defaultConfig.tokenExpiration) {
    debug('CSRF token expired for session:', sessionId);
    tokenStore.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(entry.token, 'base64url'),
      Buffer.from(providedToken, 'base64url')
    );
  } catch {
    debug('CSRF token comparison failed (invalid format)');
    return false;
  }
}

/**
 * CSRF Protection Middleware
 *
 * This middleware provides CSRF protection for state-changing operations.
 *
 * Usage:
 * 1. Client requests CSRF token via GET /api/csrf-token
 * 2. Client includes token in X-CSRF-Token header for POST/PUT/DELETE requests
 * 3. Middleware validates token before allowing the request
 *
 * Security considerations:
 * - Tokens are bound to session (IP + User-Agent)
 * - Tokens expire after 24 hours
 * - Constant-time comparison prevents timing attacks
 * - Tokens are cryptographically random
 * - CSRF is skipped in test environment (NODE_ENV=test)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    next();
    return;
  }

  // Optional skip for tests when explicitly enabled
  if (process.env.NODE_ENV === 'test' && process.env.CSRF_SKIP_IN_TEST === 'true') {
    debug('CSRF check skipped in test environment (CSRF_SKIP_IN_TEST=true)');
    next();
    return;
  }

  const sessionId = getSessionId(req);
  const providedToken = req.get(defaultConfig.headerName) || req.body?._csrf;

  if (!providedToken) {
    debug('CSRF token missing in request', {
      method,
      path: req.path,
      sessionId: sessionId.substring(0, 8) + '...',
    });

    res.status(403).json({
      error: 'CSRF Token Required',
      message: 'A valid CSRF token is required for this operation',
      code: 'CSRF_TOKEN_MISSING',
    });
    return;
  }

  if (!validateToken(sessionId, providedToken)) {
    debug('CSRF token validation failed', {
      method,
      path: req.path,
      sessionId: sessionId.substring(0, 8) + '...',
    });

    res.status(403).json({
      error: 'Invalid CSRF Token',
      message: 'The provided CSRF token is invalid or expired',
      code: 'CSRF_TOKEN_INVALID',
    });
    return;
  }

  debug('CSRF validation passed', {
    method,
    path: req.path,
    sessionId: sessionId.substring(0, 8) + '...',
  });

  next();
}

/**
 * CSRF Token Endpoint Handler
 *
 * Generates and returns a new CSRF token for the client
 * The token is stored in an httpOnly cookie and returned in the response body
 */
export function csrfTokenHandler(req: Request, res: Response): void {
  const sessionId = getSessionId(req);
  const token = generateCsrfToken();

  // Store token for this session
  storeToken(sessionId, token);

  // Set token in httpOnly cookie for additional security
  res.cookie(defaultConfig.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: defaultConfig.tokenExpiration,
    path: '/',
  });

  debug('CSRF token generated', {
    sessionId: sessionId.substring(0, 8) + '...',
    tokenPreview: token.substring(0, 8) + '...',
  });

  res.json({
    csrfToken: token,
    expiresIn: defaultConfig.tokenExpiration,
  });
}

/**
 * Optional: Double-submit cookie pattern for stateless CSRF protection
 *
 * This is an alternative approach that doesn't require server-side token storage.
 * Use this for stateless applications or when Redis is not available.
 */
export function csrfDoubleSubmit(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // Generate and set cookie for GET requests if not present
    if (!req.cookies?.[defaultConfig.cookieName]) {
      const token = generateCsrfToken();
      res.cookie(defaultConfig.cookieName, token, {
        httpOnly: false, // Must be readable by client for double-submit
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: defaultConfig.tokenExpiration,
        path: '/',
      });
    }
    next();
    return;
  }

  // For state-changing methods, validate double-submit
  const cookieToken = req.cookies?.[defaultConfig.cookieName];
  const headerToken = req.get(defaultConfig.headerName) || req.body?._csrf;

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      error: 'CSRF Token Required',
      message: 'CSRF token must be provided in both cookie and header',
      code: 'CSRF_TOKEN_MISSING',
    });
    return;
  }

  // Constant-time comparison
  try {
    if (
      crypto.timingSafeEqual(
        Buffer.from(cookieToken, 'base64url'),
        Buffer.from(headerToken, 'base64url')
      )
    ) {
      next();
      return;
    }
  } catch {
    // Invalid format - fall through to error
  }

  res.status(403).json({
    error: 'Invalid CSRF Token',
    message: 'CSRF tokens in cookie and header do not match',
    code: 'CSRF_TOKEN_MISMATCH',
  });
}

/**
 * Export configuration for testing
 */
export { defaultConfig as csrfConfig };
