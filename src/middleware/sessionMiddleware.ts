import crypto from 'crypto';
import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';

const debug = Debug('app:sessionMiddleware');

/**
 * Secure Session Management Configuration
 *
 * Security features:
 * - Strong session secret (required in production)
 * - HTTP-only cookies (not accessible via JavaScript)
 * - Secure cookies in production (HTTPS only)
 * - SameSite=strict to prevent CSRF
 * - Session fixation protection
 * - Configurable session timeout
 */

// Validate session secret strength
function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET;

  if (envSecret) {
    // Validate secret strength
    if (envSecret.length < 32) {
      console.warn('WARNING: SESSION_SECRET should be at least 32 characters long');
    }
    return envSecret;
  }

  // Generate random secret for development/test only
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET environment variable is required in production. ' +
        "Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }

  const generatedSecret = crypto.randomBytes(64).toString('hex');
  debug('Generated random session secret for development');
  return generatedSecret;
}

const SESSION_SECRET = getSessionSecret();

// Session timeout configuration
const SESSION_MAX_AGE = parseInt(process.env.SESSION_MAX_AGE || '86400000', 10); // Default: 24 hours
const SESSION_IDLE_TIMEOUT = parseInt(process.env.SESSION_IDLE_TIMEOUT || '1800000', 10); // Default: 30 minutes

// Cookie name - use non-descriptive name to avoid attention
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'hivemind.sid';

const sessionConfig: session.SessionOptions = {
  secret: SESSION_SECRET,
  name: COOKIE_NAME,
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset maxAge on every request (sliding expiration)
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Not accessible via JavaScript
    maxAge: SESSION_MAX_AGE,
    sameSite: 'strict', // Strict CSRF protection
    path: '/',
    // Don't set domain - makes cookie more secure by limiting to exact host
  },
  // Proxy setting for behind reverse proxy
  proxy: process.env.TRUST_PROXY === 'true',
};

// Create session middleware
export const sessionMiddleware = session(sessionConfig);

/**
 * Session security middleware - adds additional security checks
 */
export const sessionSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next();
  }

  // Check for session fixation attacks
  const session = req.session as any;

  // If this is a new session but user is already authenticated, regenerate
  if (session.isNew && session.userId) {
    debug('Potential session fixation detected, regenerating session');
    session.regenerate((err) => {
      if (err) {
        debug('Session regeneration failed:', err);
        return next(err);
      }
      next();
    });
    return;
  }

  // Check for idle timeout
  const lastActivity = session.lastActivity as number;
  if (lastActivity && Date.now() - lastActivity > SESSION_IDLE_TIMEOUT) {
    debug('Session idle timeout exceeded, destroying session');
    session.destroy((err) => {
      if (err) {
        debug('Session destruction failed:', err);
      }
      res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    });
    return;
  }

  // Update last activity timestamp
  session.lastActivity = Date.now();

  // Add security headers for session
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  next();
};

/**
 * Apply session management middleware with security checks
 */
export const applySessionManagement = (req: Request, res: Response, next: NextFunction) => {
  sessionMiddleware(req, res, (err) => {
    if (err) {
      debug('Session middleware error:', err);
      return next(err);
    }
    sessionSecurityMiddleware(req, res, next);
  });
};

/**
 * Require valid session middleware
 */
export const requireSession = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !(req.session as any).userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
    });
  }
  next();
};

/**
 * Destroy session (logout)
 */
export const destroySession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

/**
 * Regenerate session (prevent fixation)
 */
export const regenerateSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (req.session) {
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

export default sessionMiddleware;
