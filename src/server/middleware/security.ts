import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
export { getClientKey, isIPInCIDR, validateIP } from '../../middleware/rateLimiterCore';

const debug = Debug('app:security');

/**
 * Get client IP address correctly even behind proxies with spoofing protection
 */
export function getClientIP(req: Request): string {
  return getClientKey(req);
}

/**
 * Check if the request comes from a trusted admin IP
 */
export function isTrustedAdminIP(req: Request): boolean {
  if (process.env.FORCE_TRUSTED_LOGIN === 'true') {
    debug('FORCE_TRUSTED_LOGIN is set — granting trusted admin access');
    return true;
  }

  if (process.env.ALLOW_LOCALHOST_ADMIN !== 'true') {
    return false;
  }

  const clientIP = getClientKey(req);
  const whitelistEnv = process.env.ADMIN_IP_WHITELIST;
  const whitelist = whitelistEnv
    ? whitelistEnv.split(',').map((ip) => ip.trim()).filter(Boolean)
    : ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

  return whitelist.some((allowed) => {
    if (allowed.includes('/')) {
      return isIPInCIDR(clientIP, allowed);
    }
    return clientIP === allowed || clientIP === `::ffff:${allowed}`;
  });
}

/**
 * Middleware to restrict access to admin IPs
 */
export function adminIPGuard(req: Request, res: Response, next: NextFunction): void {
  if (isTrustedAdminIP(req)) {
    return next();
  }

  debug('Access denied: not a trusted admin IP', { ip: getClientKey(req) });
  res.status(403).json({
    success: false,
    error: 'Access denied: trusted network required',
    code: 'FORBIDDEN_NETWORK',
  });
}

/**
 * CORS middleware with security considerations
 */
export function secureCORS(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Bot-Name');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';");
  next();
}
