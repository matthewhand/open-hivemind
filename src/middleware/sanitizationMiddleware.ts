import type { NextFunction, Request, Response } from 'express';

// Input sanitization middleware
// Cleans and sanitizes user input to prevent XSS and injection attacks

/**
 * Sanitizes a string value by escaping HTML entities.
 * Exported for unit testing.
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Recursively sanitizes an object or array
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

const SKIP_HEADER_SANITIZATION = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'etag',
]);

/** Allow callers to register additional headers that should bypass sanitization */
export function addSkipHeader(...headers: string[]): void {
  for (const h of headers) SKIP_HEADER_SANITIZATION.add(h.toLowerCase());
}

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  if (req.headers && typeof req.headers === 'object') {
    const sanitizedHeaders: any = {};
    for (const key of Object.keys(req.headers)) {
      if (SKIP_HEADER_SANITIZATION.has(key.toLowerCase())) {
        sanitizedHeaders[key] = req.headers[key];
      } else {
        sanitizedHeaders[key] = sanitizeObject(req.headers[key]);
      }
    }
    req.headers = sanitizedHeaders;
  }

  next();
};

export default sanitizeInput;
