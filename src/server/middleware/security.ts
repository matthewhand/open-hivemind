import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { getClientKey, isIPInCIDR, validateIP } from '../../middleware/rateLimiterCore';

export { getClientKey, isIPInCIDR, validateIP };

const debug = Debug('app:security');

/**
 * Get client IP address correctly even behind proxies with spoofing protection
 */
export function getClientIP(req: Request): string {
  return getClientKey(req);
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (CSP)
  // SECURITY NOTE: CSP with 'unsafe-eval' and 'unsafe-inline'
  //
  // 'unsafe-eval': Required for Vite's dynamic import() in development mode and
  // React's hot module replacement (HMR). In production builds, Vite compiles
  // everything to static chunks, but we maintain this directive for development
  // compatibility and potential runtime plugin loading via MCP.
  //
  // 'unsafe-inline': Required for:
  //   1. Inline <style> tags in React components
  //   2. WebSocket connection initialization scripts
  //   3. DaisyUI theme switching which injects inline styles
  //
  // MITIGATION: All user input is sanitized via Zod schemas and the sanitization
  // middleware before being stored or rendered. See:
  //   - src/server/middleware/sanitizationMiddleware.ts
  //   - src/common/security/inputSanitizer.ts
  let cspDirectives: string[];

  if (process.env.NODE_ENV === 'development') {
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http://localhost:* https://localhost:*",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:*",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: https: http://localhost:* https://localhost:*",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "prefetch-src 'self'",
    ];
  } else {
    // Strict production CSP: No unsafe-inline or unsafe-eval
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' https:",
      "style-src 'self' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: https:",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-src 'none'",
      "worker-src 'none'",
      "manifest-src 'self'",
      "prefetch-src 'self'",
    ];
  }

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === 'production' && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove server information
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Application-Name', 'Open-Hivemind');
  res.setHeader('X-Application-Version', process.env.npm_package_version || '1.0.0');

  debug('Security headers applied to response');
  next();
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
    ? whitelistEnv
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
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

// Alias for compatibility
export const ipWhitelist = adminIPGuard;

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
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Bot-Name'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}
