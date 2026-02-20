/**
 * @fileoverview Comprehensive Input Validation Middleware
 * @module validation/inputValidator
 * @description Provides centralized input validation for all API endpoints
 */

import Debug from 'debug';
import DOMPurify from 'dompurify';
import type { NextFunction, Request, Response } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { JSDOM } from 'jsdom';
import { ValidationError } from '../types/errorClasses';

const debug = Debug('app:inputValidator');
const window = new JSDOM('').window;
const dompurify = DOMPurify(window as any);

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  // MongoDB-style ObjectId
  objectId: /^[a-f\d]{24}$/i,
  // UUID v4
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  // Alphanumeric with spaces, hyphens, underscores
  safeString: /^[a-zA-Z0-9\s\-_]+$/,
  // Bot name
  botName: /^[a-zA-Z][a-zA-Z0-9\-_]{2,31}$/,
  // No HTML tags
  noHtml: /^[^<>]*$/,
  // Safe path (no directory traversal)
  safePath: /^[a-zA-Z0-9\-_/.]+$/,
  // URL
  url: /^https?:\/\/[^\s<>"]+$/,
  // Email
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/**
 * Input sanitization options
 */
export interface SanitizationOptions {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  escapeHtml?: boolean;
  stripHtml?: boolean;
  removeNull?: boolean;
  maxLength?: number;
  minLength?: number;
}

/**
 * Sanitize a string value based on options
 */
export function sanitizeValue(value: string, options: SanitizationOptions = {}): string {
  if (typeof value !== 'string') {
    return value;
  }

  let result = value;

  if (options.removeNull) {
    result = result.replace(/\0/g, '');
  }

  if (options.trim) {
    result = result.trim();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.stripHtml) {
    result = dompurify.sanitize(result, { ALLOWED_TAGS: [] });
  }

  if (options.escapeHtml) {
    result = result
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;');
  }

  if (options.maxLength !== undefined && result.length > options.maxLength) {
    result = result.substring(0, options.maxLength);
  }

  if (options.minLength !== undefined && result.length < options.minLength) {
    // Don't pad, just return as-is for validation to catch
  }

  return result;
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeValue(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeValue(key, { ...options, stripHtml: true });
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Common validation chains for reuse
 */
export const CommonValidators = {
  // Bot ID validation
  botId: param('botId')
    .trim()
    .matches(ValidationPatterns.botName)
    .withMessage('Invalid bot ID format')
    .escape(),

  // User ID validation
  userId: param('userId')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('User ID must be 1-128 characters')
    .escape(),

  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  // Search query
  search: query('search')
    .optional()
    .trim()
    .isLength({ max: 256 })
    .withMessage('Search query too long')
    .escape(),

  // Name field
  name: body('name')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('Name must be 1-128 characters')
    .matches(ValidationPatterns.noHtml)
    .withMessage('Name cannot contain HTML'),

  // Description field
  description: body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description too long (max 2000 characters)')
    .customSanitizer((value) =>
      dompurify.sanitize(value, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] })
    ),

  // URL field
  url: body('url')
    .optional()
    .trim()
    .matches(ValidationPatterns.url)
    .withMessage('Invalid URL format')
    .isLength({ max: 2048 })
    .withMessage('URL too long'),

  // Email field
  email: body('email').trim().normalizeEmail().isEmail().withMessage('Invalid email address'),

  // Password field
  password: body('password')
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be 12-128 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),

  // API Key field (sensitive - don't log)
  apiKey: body('apiKey')
    .optional()
    .trim()
    .isLength({ min: 16, max: 256 })
    .withMessage('API key must be 16-256 characters'),

  // Token field
  token: body('token')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Token is required')
    .isJWT()
    .withMessage('Invalid token format'),

  // JSON config field
  config: body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object')
    .custom((value: any) => {
      // Check for prototype pollution attempts
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      const hasDangerousKey = (obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        for (const key of Object.keys(obj)) {
          if (dangerousKeys.includes(key)) return true;
          if (hasDangerousKey(obj[key])) return true;
        }
        return false;
      };
      if (hasDangerousKey(value)) {
        throw new Error('Config contains forbidden keys');
      }
      return true;
    }),

  // Provider type
  provider: body('provider')
    .trim()
    .isIn([
      'discord',
      'slack',
      'mattermost',
      'openai',
      'flowise',
      'openwebui',
      'perplexity',
      'replicate',
      'n8n',
    ])
    .withMessage('Invalid provider type'),

  // Boolean field
  boolean: (field: string) =>
    body(field).optional().isBoolean().withMessage(`${field} must be a boolean`).toBoolean(),

  // Array of strings
  stringArray: (field: string) =>
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`)
      .custom((arr: any[]) => {
        if (!arr.every((item) => typeof item === 'string')) {
          throw new Error(`${field} must contain only strings`);
        }
        return true;
      }),
};

/**
 * Validation middleware that checks for errors
 */
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value !== undefined ? '[REDACTED]' : undefined,
    }));

    debug('Validation errors:', errorMessages);

    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorMessages,
    });
  }

  next();
};

/**
 * Create validation middleware from array of validation chains
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    validateInput(req, res, next);
  };
}

/**
 * Sanitization middleware for request body
 */
export const sanitizeRequestBody = (options: SanitizationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, {
        trim: true,
        removeNull: true,
        ...options,
      });
    }
    next();
  };
};

/**
 * Sanitization middleware for query parameters
 */
export const sanitizeQueryParams = (options: SanitizationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, {
        trim: true,
        removeNull: true,
        ...options,
      });
    }
    next();
  };
};

/**
 * Sanitization middleware for URL parameters
 */
export const sanitizeUrlParams = (options: SanitizationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, {
        trim: true,
        removeNull: true,
        ...options,
      });
    }
    next();
  };
};

/**
 * Combined sanitization middleware
 */
export const sanitizeAll = (options: SanitizationOptions = {}) => {
  return [sanitizeRequestBody(options), sanitizeQueryParams(options), sanitizeUrlParams(options)];
};

/**
 * NoSQL injection prevention
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkForInjection = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;

    const dangerousOperators = [
      '$where',
      '$gt',
      '$lt',
      '$gte',
      '$lte',
      '$ne',
      '$in',
      '$nin',
      '$or',
      '$and',
      '$not',
      '$nor',
      '$exists',
      '$type',
      '$mod',
      '$regex',
      '$text',
      '$elemMatch',
      '$size',
      '$all',
      '$slice',
      '$comment',
      '$meta',
      '$natural',
    ];

    for (const key of Object.keys(obj)) {
      if (dangerousOperators.includes(key)) {
        return true;
      }
      if (typeof obj[key] === 'object' && checkForInjection(obj[key])) {
        return true;
      }
    }
    return false;
  };

  if (
    checkForInjection(req.body) ||
    checkForInjection(req.query) ||
    checkForInjection(req.params)
  ) {
    debug('Potential NoSQL injection detected');
    return res.status(400).json({
      error: 'Invalid input detected',
      code: 'INJECTION_DETECTED',
    });
  }

  next();
};

/**
 * Content-Type validation
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET, DELETE, OPTIONS
    if (['GET', 'DELETE', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      return res.status(415).json({
        error: 'Content-Type header is required',
        code: 'MISSING_CONTENT_TYPE',
      });
    }

    const isAllowed = allowedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      return res.status(415).json({
        error: `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`,
        code: 'UNSUPPORTED_CONTENT_TYPE',
      });
    }

    next();
  };
};

/**
 * Request size limit middleware
 */
export const limitRequestSize = (maxSizeKB: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSizeBytes = maxSizeKB * 1024;

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: `Request body too large. Maximum size: ${maxSizeKB}KB`,
        code: 'REQUEST_TOO_LARGE',
      });
    }

    next();
  };
};

export default {
  ValidationPatterns,
  CommonValidators,
  validate,
  validateInput,
  sanitizeValue,
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeUrlParams,
  sanitizeAll,
  preventNoSQLInjection,
  validateContentType,
  limitRequestSize,
};
