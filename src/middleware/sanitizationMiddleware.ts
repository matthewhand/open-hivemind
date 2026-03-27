import type { NextFunction, Request, Response } from 'express';

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

function sanitizeString(value: string): string {
  return value
    .replace(/\x00/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item));
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

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
  if (req.headers) {
    const sanitizedHeaders: typeof req.headers = {};
    for (const key of Object.keys(req.headers)) {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-') && !SKIP_HEADER_SANITIZATION.has(lower)) {
        sanitizedHeaders[key] = sanitizeObject(req.headers[key]);
      } else {
        sanitizedHeaders[key] = req.headers[key];
      }
    }
    req.headers = sanitizedHeaders;
  }
  next();
};

export default sanitizeInput;
