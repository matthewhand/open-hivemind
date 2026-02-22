import Debug from 'debug';
import { type NextFunction, type Request, type Response } from 'express';
import { body, validationResult, type ValidationChain } from 'express-validator';

const debug = Debug('app:validation');

/**
 * Options for sanitization
 */
export interface SanitizationOptions {
  /**
   * Whether to trim whitespace
   */
  trim?: boolean;

  /**
   * Whether to escape HTML special characters
   */
  escapeHtml?: boolean;

  /**
   * Whether to convert to lowercase
   */
  lowercase?: boolean;
}

/**
 * Sanitizes a single string value
 *
 * @param value - The value to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeValue(value: string, options: SanitizationOptions = {}): string {
  if (typeof value !== 'string') {
    return value;
  }

  let result = value;

  if (options.trim !== false) {
    result = result.trim();
  }

  if (options.escapeHtml) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  return result;
}

/**
 * Recursively sanitizes all string properties in an object
 *
 * @param obj - The object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T>(obj: T, options: SanitizationOptions = {}): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options)) as unknown as T;
  }

  const result = { ...obj } as any;

  for (const key in result) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeValue(result[key], options);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitizeObject(result[key], options);
    }
  }

  return result;
}

/**
 * Common validators for reuse
 */
export const CommonValidators = {
  // Required string field
  requiredString: (field: string) =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} is required`)
      .isString()
      .withMessage(`${field} must be a string`),

  // Optional string field
  optionalString: (field: string) => body(field).optional().isString().withMessage(`${field} must be a string`),

  // URL field
  url: (field: string) => body(field).optional().isURL().withMessage(`${field} must be a valid URL`),

  // Email field
  email: (field: string) => body(field).optional().isEmail().withMessage(`${field} must be a valid email`),

  // Enum field
  oneOf: (field: string, values: string[]) =>
    body(field)
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),

  // Provider type
  providerType: (field: string) =>
    body(field)
      .optional()
      .isIn(['openai', 'flowise', 'openwebui', 'ollama', 'anthropic', 'google', 'discord', 'slack', 'mattermost'])
      .withMessage('Invalid provider type'),

  // Boolean field
  boolean: (field: string): ValidationChain =>
    body(field).optional().isBoolean().withMessage(`${field} must be a boolean`).toBoolean(),

  // Array of strings
  stringArray: (field: string): ValidationChain =>
    body(field)
      .optional()
      .isArray()
      .withMessage(`${field} must be an array`)
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every((item) => typeof item === 'string');
        }
        return true;
      })
      .withMessage(`${field} must contain only strings`),
};

/**
 * Validation middleware that checks for errors
 */
export const validateInput = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err: any) => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value !== undefined ? '[REDACTED]' : undefined,
    }));

    debug('Validation errors:', errorMessages);

    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorMessages,
    });
    return;
  }

  next();
};

/**
 * Higher-order middleware to wrap express-validator chains
 *
 * @param validations - Array of validation chains
 * @returns Array of middleware
 */
export function validate(validations: ValidationChain[]) {
  return [...validations, validateInput];
}

/**
 * Sanitization middleware for request body
 */
export const sanitizeRequestBody = (options: SanitizationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, {
        trim: true,
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
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, {
        trim: true,
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
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, {
        trim: true,
        ...options,
      });
    }
    next();
  };
};

/**
 * Sanitization middleware for all request data
 */
export const sanitizeAll = (options: SanitizationOptions = {}) => {
  return [sanitizeRequestBody(options), sanitizeQueryParams(options), sanitizeUrlParams(options)];
};

/**
 * NoSQL injection prevention
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction): void => {
  const checkForInjection = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;

    for (const key in obj) {
      // Check for common NoSQL operators
      if (key.startsWith('$')) {
        return true;
      }

      // Recursive check for nested objects
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkForInjection(obj[key])) {
          return true;
        }
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
    res.status(400).json({
      error: 'Invalid input detected',
      code: 'INJECTION_DETECTED',
    });
    return;
  }

  next();
};

/**
 * Validate Content-Type header
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE' || !req.headers['content-type']) {
      return next();
    }

    const contentType = req.headers['content-type'].split(';')[0];

    if (!allowedTypes.includes(contentType)) {
      return res.status(415).json({
        error: `Unsupported Media Type. Allowed types: ${allowedTypes.join(', ')}`,
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
    }

    next();
  };
};

/**
 * Request size limit middleware
 */
export const limitRequestSize = (maxSizeKB: number = 100) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSizeBytes = maxSizeKB * 1024;

    if (contentLength > maxSizeBytes) {
      res.status(413).json({
        error: `Request body too large. Maximum size: ${maxSizeKB}KB`,
        code: 'REQUEST_TOO_LARGE',
      });
      return;
    }

    next();
  };
};

export default {
  sanitizeValue,
  sanitizeObject,
  CommonValidators,
  validateInput,
  validate,
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeUrlParams,
  sanitizeAll,
  preventNoSQLInjection,
  validateContentType,
  limitRequestSize,
};
