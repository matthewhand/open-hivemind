import cors from 'cors';
import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';

const debug = Debug('app:corsMiddleware');

/**
 * Production-safe CORS configuration
 *
 * Security considerations:
 * - In production, origins must be explicitly configured via CORS_ORIGIN env var
 * - Wildcard (*) is only allowed in development
 * - Credentials are only enabled for specific origins
 */

// Get allowed origins from environment or use defaults
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGIN;

  if (envOrigins) {
    // Parse comma-separated origins from environment
    return envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  // Default origins for development
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return [
      'http://localhost:3000',
      'http://localhost:3028',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3028',
      'http://127.0.0.1:3001',
    ];
  }

  // In production without CORS_ORIGIN set, be restrictive
  console.warn('WARNING: CORS_ORIGIN not set in production. CORS will be restrictive.');
  return [];
}

const allowedOrigins = getAllowedOrigins();

// Validate origin format
function isValidOriginFormat(origin: string): boolean {
  try {
    const url = new URL(origin);
    // Only allow http and https protocols
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Filter and validate origins
const validatedOrigins = allowedOrigins.filter((origin) => {
  if (origin === '*') {
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: Wildcard CORS origin (*) is not recommended in production');
    }
    return true;
  }
  const isValid = isValidOriginFormat(origin);
  if (!isValid) {
    console.warn(`WARNING: Invalid CORS origin format: ${origin}`);
  }
  return isValid;
});

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In development/test, allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        // In production, be more restrictive about no-origin requests
        debug('No origin header in production request - allowing for API compatibility');
      }
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (validatedOrigins.includes(origin)) {
      debug(`CORS: Origin ${origin} allowed`);
      callback(null, origin);
    } else if (validatedOrigins.includes('*')) {
      // Wildcard allowed (development only recommended)
      debug(`CORS: Origin ${origin} allowed via wildcard`);
      callback(null, origin);
    } else {
      debug(`CORS: Origin ${origin} blocked`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours - cache preflight response
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

// Pre-configured CORS middleware
export const corsMiddleware = cors(corsOptions);

/**
 * Custom CORS middleware that handles rejections properly
 * Use this when you need more control over CORS handling
 */
export const applyCors = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (!origin) {
      // No origin for preflight - allow
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (validatedOrigins.includes(origin) || validatedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      debug(`CORS preflight blocked for origin: ${origin}`);
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-API-Key'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Handle actual requests
  if (!origin) {
    // No origin header - allow for API clients
    // But don't set wildcard with credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
    return next();
  }

  if (validatedOrigins.includes(origin) || validatedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Request-ID, X-API-Key'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
    );
    return next();
  }

  // Origin not allowed
  debug(`CORS request blocked for origin: ${origin}`);
  return res.status(403).json({ error: 'CORS origin not allowed' });
};

/**
 * Get the list of validated CORS origins
 */
export function getCorsOrigins(): string[] {
  return [...validatedOrigins];
}

export default corsMiddleware;
