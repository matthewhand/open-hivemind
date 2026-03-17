import type { NextFunction, Request, Response } from 'express';

<<<<<<< HEAD
<<<<<<< HEAD
const SKIP_HEADER_SANITIZATION = new Set([
  'authorization',
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'cookie',
  'connection',
  'content-disposition',
  'content-encoding',
  'content-language',
  'content-length',
  'content-type',
  'dnt',
  'set-cookie',
  'etag',
  'host',
  'if-modified-since',
  'if-none-match',
  'origin',
  'pragma',
  'proxy-authorization',
  'range',
  'referer',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'upgrade-insecure-requests',
  'user-agent',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
]);
=======
// Input sanitization middleware
// Cleans and sanitizes user input to prevent XSS and injection attacks
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629

/**
 * Sanitizes a string value by escaping HTML entities
 */
function sanitizeString(value: string): string {
  return value
<<<<<<< HEAD
    .replace(/\x00/g, '')
=======
// Input sanitization middleware
// Cleans and sanitizes user input to prevent XSS and injection attacks

/**
 * Sanitizes a string value by escaping HTML entities
 */
function sanitizeString(value: string): string {
  return value
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

<<<<<<< HEAD
<<<<<<< HEAD
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
=======
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

>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

<<<<<<< HEAD
=======
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

/**
 * Middleware to sanitize request body, query, and params
 */
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
/**
 * Middleware to sanitize request body, query, and params
 */
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
<<<<<<< HEAD
    req.params = sanitizeObject(req.params) as typeof req.params;
  }
<<<<<<< HEAD
  if (req.headers && typeof req.headers === 'object') {
    const sanitizedHeaders: any = {};
    for (const key of Object.keys(req.headers)) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === '__proto__' ||
        normalizedKey === 'constructor' ||
        normalizedKey === 'prototype'
      ) {
        continue;
      }
      if (SKIP_HEADER_SANITIZATION.has(normalizedKey) || !normalizedKey.startsWith('x-')) {
        sanitizedHeaders[key] = req.headers[key];
      } else {
        sanitizedHeaders[key] = sanitizeObject(req.headers[key]);
      }
    }
    req.headers = sanitizedHeaders;
  }
=======

>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
    req.params = sanitizeObject(req.params);
  }

>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
  next();
};

export default sanitizeInput;
