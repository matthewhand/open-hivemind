import type { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Common validation schemas
export const commonValidations = {
  // For API requests
  apiKey: () => body('apiKey').optional().isString().trim().escape(),

  // For user inputs
  username: () =>
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/),
  email: () => body('email').isEmail().normalizeEmail(),

  // For configuration values
  configName: () => body('name').isLength({ min: 1, max: 100 }).trim().escape(),
  configValue: () => body('value').isLength({ min: 1, max: 1000 }).trim().escape(),

  // For general text inputs
  comment: () => body('comment').isLength({ min: 1, max: 1000 }).trim().escape(),
  message: () => body('message').isLength({ min: 1, max: 5000 }).trim().escape(),

  // For numeric values
  number: (min: number = 0, max: number = 1000000) => body('number').isInt({ min, max }).toInt(),

  // For boolean values
  boolean: () => body('boolean').isBoolean().toBoolean(),

  // For URL validation
  url: () =>
    body('url').isURL({ protocols: ['http', 'https'], require_tld: true, require_protocol: true }),

  // For object IDs
  objectId: () => body('id').isAlphanumeric().isLength({ min: 1, max: 50 }),
};
