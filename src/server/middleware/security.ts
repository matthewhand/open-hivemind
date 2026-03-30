import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitError } from '../../types/errorClasses';

const debug = Debug('app:securityMiddleware');

// Module-scoped rate-limit store (replaces global.rateLimitStore).
// Scoped to the module lifecycle so it is garbage-collected when the module is
// unloaded and never bleeds between jest test runs after jest.resetModules().
const rateLimitStore = new Map<string, { requests: number[]; resetTime: number }>();

// Cache trusted proxies at module load time for performance
let cachedTrustedProxies: string[] | null = null;

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
  const key = `ratelimit:${clientIP}`;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { requests: [], resetTime: now + windowMs });
  }

  const clientData = rateLimitStore.get(key)!;

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
 * Configuration for trusted proxies
 * Can be set via TRUSTED_PROXIES env variable (comma-separated)
 * Defaults to common local/internal network addresses
 */
function getTrustedProxies(): string[] {
  // Return cached value if available
  if (cachedTrustedProxies !== null) {
    return cachedTrustedProxies;
  }

  const envProxies = process.env.TRUSTED_PROXIES;
  if (envProxies) {
    const proxies: string[] = [];
    const entries = envProxies
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    for (const entry of entries) {
      // Allow wildcard
      if (entry === '*') {
        proxies.push(entry);
        continue;
      }

      // Validate CIDR notation
      if (entry.includes('/')) {
        const [network, prefix] = entry.split('/');
        const prefixNum = parseInt(prefix, 10);
        if (
          !isNaN(prefixNum) &&
          prefixNum >= 0 &&
          prefixNum <= 32 &&
          network.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
        ) {
          proxies.push(entry);
        } else {
          debug('Warning: Invalid CIDR in TRUSTED_PROXIES:', entry);
        }
        continue;
      }

      // Validate IP address (basic check)
      if (
        entry.match(/^(\d{1,3}\.){3}\d{1,3}$/) ||
        entry.match(/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/) ||
        entry === '::1'
      ) {
        proxies.push(entry);
      } else {
        debug('Warning: Invalid IP in TRUSTED_PROXIES:', entry);
      }
    }

    cachedTrustedProxies = proxies;
    return proxies;
  }

  // Default trusted proxies - localhost and private network ranges
  cachedTrustedProxies = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
  ];
  return cachedTrustedProxies;
}

/**
 * Check if an IP address matches a trusted proxy
 * Supports CIDR notation for ranges
 */
function isTrustedProxy(ip: string): boolean {
  const trustedProxies = getTrustedProxies();

  for (const trusted of trustedProxies) {
    // Check for exact match
    if (!trusted.includes('/')) {
      if (ip === trusted || ip === `::ffff:${trusted}`) {
        return true;
      }
    } else if (ip === trusted) {
      return true;
    }

    // Check for wildcard (allow all) - only '*' is supported, not '0.0.0.0'
    if (trusted === '*') {
      return true;
    }

    // Check CIDR notation
    if (trusted.includes('/')) {
      if (isIPInCIDR(ip, trusted)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate and sanitize an IP address
 * Returns null if the IP is invalid or potentially malicious
 */
function validateIP(ip: string): string | null {
  if (!ip || typeof ip !== 'string') {
    return null;
  }

  // Trim whitespace
  ip = ip.trim();

  // Reject IPs with suspicious characters (prevent header injection)
  if (/[\r\n\0]/.test(ip)) {
    return null;
  }

  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    ip = ipv4Match[1];
  }

  // Validate IPv4 format
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Result = ip.match(ipv4Regex);
  if (ipv4Result) {
    const [, a, b, c, d] = ipv4Result;
    const octets = [a, b, c, d];
    for (const octet of octets) {
      // Reject leading zeros (octal confusion attack) - only "0" is allowed
      if (octet.length > 1 && octet.startsWith('0')) {
        return null;
      }
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return null;
      }
    }
    return ip;
  }

  // Validate IPv6 format (basic check)
  // IPv6 can be compressed, so we just check for valid hex characters and colons
  const ipv6Regex =
    /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::1$/;
  if (ipv6Regex.test(ip)) {
    return ip;
  }

  return null;
}

/**
 * Get the immediate connection IP (not from headers)
 * This is the IP that actually connected to the server
 */
function getConnectionIP(req: Request): string {
  const remoteAddress = req.socket?.remoteAddress || 'unknown';
  const validated = validateIP(remoteAddress);
  return validated || 'unknown';
}

/**
 * Get client IP address from request
 *
 * SECURITY: This function now validates that proxy headers are only trusted
 * when the request comes from a trusted proxy. This prevents IP spoofing attacks
 * where an attacker could set X-Forwarded-For to 127.0.0.1 to bypass access controls.
 */
function getClientIP(req: Request): string {
  // Get the actual connection IP
  const connectionIP = getConnectionIP(req);

  // Only trust proxy headers if the connection comes from a trusted proxy
  if (!isTrustedProxy(connectionIP)) {
    debug('Untrusted proxy - using connection IP:', connectionIP);
    return connectionIP;
  }

  // Trust proxy headers - check in order of preference
  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
  // The first IP is the original client
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs separated by commas
    // We take the first one as the client IP, but validate it
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    for (const ip of ips) {
      const validated = validateIP(ip);
      if (validated) {
        debug('Using X-Forwarded-For IP:', validated, 'via trusted proxy:', connectionIP);
        return validated;
      }
    }
  }

  const realIP = req.get('x-real-ip');
  if (realIP) {
    const validated = validateIP(realIP);
    if (validated) {
      debug('Using X-Real-IP:', validated, 'via trusted proxy:', connectionIP);
      return validated;
    }
  }

  const clientIP = req.get('x-client-ip');
  if (clientIP) {
    const validated = validateIP(clientIP);
    if (validated) {
      debug('Using X-Client-IP:', validated, 'via trusted proxy:', connectionIP);
      return validated;
    }
  }

  // Fall back to connection remote address
  debug('No proxy headers found, using connection IP:', connectionIP);
  return connectionIP;
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
    if (allowedIP === '*') {
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
    });
    return;
  }

  debug('IP access granted:', { ip: clientIP, method: req.method, url: req.url });
  next();
}

/**
 * Convert IPv4 address to numeric representation for comparison
 * Returns NaN for invalid IP addresses
 */
function ipToLong(ip: string): number {
  // Validate IP format first
  if (!ip || typeof ip !== 'string') {
    return NaN;
  }

  const parts = ip.split('.');
  if (parts.length !== 4) {
    return NaN;
  }

  const nums = parts.map((p) => parseInt(p, 10));

  // Validate each octet is a number between 0-255
  for (const num of nums) {
    if (isNaN(num) || num < 0 || num > 255) {
      return NaN;
    }
  }

  return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

/**
 * Check if an IP address is in a CIDR range
 * Supports both IPv4 and IPv4-mapped IPv6 addresses
 * Note: IPv6 CIDR ranges are not currently supported
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    // Handle IPv4-mapped IPv6 addresses
    let cleanIP = ip;
    const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (ipv4Match) {
      cleanIP = ipv4Match[1];
    }

    // Only support IPv4 CIDR for now - warn if IPv6 CIDR is provided
    if (!cleanIP.includes('.') || cleanIP.includes(':')) {
      return false;
    }

    // Validate CIDR network part is IPv4
    const [network, prefixStr] = cidr.split('/');
    if (!network.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      debug('Warning: IPv6 CIDR not supported:', cidr);
      return false;
    }

    const prefix = parseInt(prefixStr, 10);

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipLong = ipToLong(cleanIP);
    const networkLong = ipToLong(network);

    // Validate IP conversions succeeded
    if (isNaN(ipLong) || isNaN(networkLong)) {
      return false;
    }

    // Handle /0 prefix specially - it should match all IPs
    // Note: JavaScript shift is modulo 32, so -1 << 32 === -1, not 0
    if (prefix === 0) {
      return true;
    }

    const mask = -1 << (32 - prefix);

    return (ipLong & mask) === (networkLong & mask);
  } catch (e) {
    debug('CIDR parsing error:', e);
    return false;
  }
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
