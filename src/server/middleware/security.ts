import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitError } from '../../types/errorClasses';

const debug = Debug('app:securityMiddleware');

/**
 * Security middleware that adds comprehensive security headers
 * to protect against common web vulnerabilities
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
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:", // Allow inline scripts for WebSocket connections
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' ws: wss: https:", // Allow WebSocket connections
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'", // Prevent iframes
    "worker-src 'none'", // Prevent web workers
    "manifest-src 'self'",
    "prefetch-src 'self'",
  ];

  if (process.env.NODE_ENV === 'development') {
    // Relax CSP for development
    cspDirectives.push(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*"
    );
    cspDirectives.push("connect-src 'self' ws: wss: http://localhost:* https://localhost:*");
    cspDirectives.push(
      "style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com"
    );
  }

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === 'production' && req.secure) {
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
 * Request logging middleware for security monitoring
 */
export function securityLogging(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Log security-relevant information
  debug('Security Log - Request:', {
    method: req.method,
    url: req.url,
    ip: clientIP,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
    timestamp: new Date().toISOString(),
    headers: {
      'content-type': req.get('content-type'),
      accept: req.get('accept'),
      referer: req.get('referer'),
      origin: req.get('origin'),
    },
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    debug('Security Log - Response:', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: clientIP,
    });

    // Alert on suspicious activity
    if (res.statusCode >= 400) {
      debug('Security Alert - Error response:', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        ip: clientIP,
        userAgent: userAgent.substring(0, 50),
      });
    }

    // Alert on slow responses (potential DoS)
    if (duration > 10000) {
      // 10 seconds
      debug('Security Alert - Slow response:', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        ip: clientIP,
      });
    }
  });

  next();
}

/**
 * Rate limiting middleware for API endpoints
 */
export function apiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // requests per window

  // This is a simple in-memory rate limiter
  // In production, you'd want to use Redis or another persistent store
  if (!(global as any).rateLimitStore) {
    (global as any).rateLimitStore = new Map();
  }

  const store = (global as any).rateLimitStore;
  const key = `ratelimit:${clientIP}`;

  if (!store.has(key)) {
    store.set(key, { requests: [], resetTime: now + windowMs });
  }

  const clientData = store.get(key);

  // Clean up old requests
  clientData.requests = clientData.requests.filter(
    (timestamp: number) => timestamp > now - windowMs
  );

  // Check if limit exceeded
  if (clientData.requests.length >= maxRequests) {
    debug('Rate limit exceeded for IP:', clientIP);
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
    return next(
      new RateLimitError(
        'Rate limit exceeded. Please try again later.',
        retryAfter,
        maxRequests,
        0,
        new Date(clientData.resetTime)
      )
    );
  }

  // Add current request
  clientData.requests.push(now);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.requests.length).toString());
  res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

  next();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        const sanitized = value.replace(/[<>'"&]/g, '');
        (req.query as any)[key] = sanitized;
      }
    }
  }

  // Sanitize body parameters (for POST/PUT requests)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize headers and cookies
  sanitizeHeaders(req);
  sanitizeCookies(req);

  next();
}

/**
 * Recursively sanitize object properties
 * Strips script injection patterns without HTML-encoding data values,
 * which would corrupt legitimate API payloads (URLs with &, JSON strings, etc.).
 */
function sanitizeObject(obj: any): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Strip dangerous script/iframe tags and event handler attributes.
      // Do NOT HTML-encode characters like <, >, &, ', " — these are valid
      // in API request values and encoding them corrupts the data.
      obj[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value);
    }
  }
}

/**
 * Sanitize request headers
 * Only strips script-injection patterns from non-security-sensitive headers.
 * Headers such as Authorization and Cookie carry opaque token values and must
 * not be modified — stripping characters from them breaks authentication.
 */
const SKIP_HEADER_SANITIZATION = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
]);

function sanitizeHeaders(req: Request): void {
  if (req.headers) {
    for (const [key, value] of Object.entries(req.headers)) {
      if (SKIP_HEADER_SANITIZATION.has(key.toLowerCase())) {
        continue;
      }
      if (typeof value === 'string') {
        // Strip script tags and javascript: URIs from header values.
        req.headers[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '');
      }
    }
  }
}

/**
 * Sanitize request cookies
 */
function sanitizeCookies(req: Request): void {
  if (req.cookies) {
    for (const [key, value] of Object.entries(req.cookies)) {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters from cookies
        req.cookies[key] = value.replace(/[<>'"&]/g, '');
      }
    }
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  // Check for forwarded IP headers (common with proxies/load balancers)
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = req.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const clientIP = req.get('x-client-ip');
  if (clientIP) {
    return clientIP;
  }

  // Fall back to connection remote address
  return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
}

/**
 * IP whitelist middleware for admin endpoints
 */
export function ipWhitelist(req: Request, res: Response, next: NextFunction): void {
  const clientIP = getClientIP(req);

  // Get whitelist from environment or config
  const whitelistEnv = process.env.ADMIN_IP_WHITELIST;
  let whitelist: string[] = [];

  if (whitelistEnv) {
    whitelist = whitelistEnv.split(',').map((ip) => ip.trim());
  } else {
    // Try to load from config files
    try {
      const config = require('config');
      const adminConfig = config.get('admin');
      if (adminConfig && adminConfig.ipWhitelist && Array.isArray(adminConfig.ipWhitelist)) {
        whitelist = adminConfig.ipWhitelist;
      }
    } catch (configError) {
      debug('Could not load config for IP whitelist:', configError);
    }

    // Default to localhost for development if no config found
    if (whitelist.length === 0) {
      whitelist = ['127.0.0.1', '::1', 'localhost'];
    }
  }

  // Check if IP is in whitelist
  const isAllowed = whitelist.some((allowedIP) => {
    if (allowedIP === '*' || allowedIP === '0.0.0.0') {
      return true; // Allow all
    }
    if (allowedIP.includes('/')) {
      // CIDR notation support (basic)
      return isIPInCIDR(clientIP, allowedIP);
    }
    return clientIP === allowedIP || clientIP === `::ffff:${allowedIP}`;
  });

  if (!isAllowed) {
    debug('IP access denied:', {
      ip: clientIP,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')?.substring(0, 100),
    });

    res.status(403).json({
      error: 'Access Denied',
      message: 'Your IP address is not authorized to access this resource.',
      ip: clientIP,
    });
    return;
  }

  debug('IP access granted:', { ip: clientIP, method: req.method, url: req.url });
  next();
}

/**
 * Basic CIDR check for IP ranges
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [network, prefix] = cidr.split('/');
    const prefixLen = parseInt(prefix);

    // Simple implementation - in production you'd use a proper library
    if (
      ip.startsWith(
        network
          .split('.')
          .slice(0, Math.floor(prefixLen / 8))
          .join('.')
      )
    ) {
      return true;
    }
  } catch (e) {
    debug('CIDR parsing error:', e);
  }
  return false;
}

/**
 * CORS middleware with security considerations
 */
export function secureCORS(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');

  // Allow specific origins or localhost in development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  // In production, you might want to restrict this further
  if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}
