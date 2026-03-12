import type { NextFunction, Request, Response } from 'express';

// Headers that must never be sanitized — altering them breaks HTTP parsing
const PROTECTED_HEADERS = new Set([
  'content-type', 'content-length', 'transfer-encoding',
  'authorization', 'cookie', 'host', 'accept', 'accept-encoding',
  'accept-language', 'connection', 'user-agent',
]);

export interface SanitizeOptions {
  /** Field names (dot-path) to skip entirely, e.g. ['body.rawHtml'] */
  skipFields?: string[];
  /** Whether to sanitize request headers (default: false — risky) */
  sanitizeHeaders?: boolean;
}

function stripNullBytes(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x00/g, '');
}

function sanitizeString(value: string): string {
  return stripNullBytes(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeObject(obj: unknown, skipFields: Set<string>, path = ''): unknown {
  if (typeof obj === 'string') {
    return skipFields.has(path) ? obj : sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item, i) => sanitizeObject(item, skipFields, `${path}[${i}]`));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const fieldPath = path ? `${path}.${key}` : key;
      sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key], skipFields, fieldPath);
    }
    return sanitized;
  }
  return obj;
}

export function createSanitizeMiddleware(options: SanitizeOptions = {}) {
  const skipFields = new Set(options.skipFields ?? []);

  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, skipFields, 'body');
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, skipFields, 'query') as typeof req.query;
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, skipFields, 'params') as typeof req.params;
    }
    if (options.sanitizeHeaders && req.headers && typeof req.headers === 'object') {
      for (const key of Object.keys(req.headers)) {
        if (PROTECTED_HEADERS.has(key.toLowerCase())) continue;
        const val = req.headers[key];
        if (typeof val === 'string') {
          req.headers[key] = sanitizeString(val);
        } else if (Array.isArray(val)) {
          req.headers[key] = val.map(v => sanitizeString(v));
        }
      }
    }
    next();
  };
}

/** Default middleware instance — sanitizes body/query/params, skips headers */
export const sanitizeInput = createSanitizeMiddleware();

export default sanitizeInput;
