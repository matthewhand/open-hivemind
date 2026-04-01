import type { NextFunction, Request, Response } from 'express';
import { body, validationResult, type ValidationChain } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction): void | Response => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

// Common validation schemas
export const commonValidations = {
  // For API requests
  apiKey: (): ValidationChain => body('apiKey').optional().isString().trim().escape(),

  // For user inputs
  username: (): ValidationChain =>
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/),
  email: (): ValidationChain => body('email').isEmail().normalizeEmail(),

  // For configuration values
  configName: (): ValidationChain => body('name').isLength({ min: 1, max: 100 }).trim().escape(),
  configValue: (): ValidationChain => body('value').isLength({ min: 1, max: 1000 }).trim().escape(),

  // For general text inputs
  comment: (): ValidationChain => body('comment').isLength({ min: 1, max: 1000 }).trim().escape(),
  message: (): ValidationChain => body('message').isLength({ min: 1, max: 5000 }).trim().escape(),

  // For numeric values
  number: (min = 0, max = 1000000): ValidationChain => body('number').isInt({ min, max }).toInt(),

  // For boolean values
  boolean: (): ValidationChain => body('boolean').isBoolean().toBoolean(),

  // For URL validation
  url: (): ValidationChain =>
    body('url').isURL({ protocols: ['http', 'https'], require_tld: true, require_protocol: true }),

  // For object IDs
  objectId: (): ValidationChain => body('id').isAlphanumeric().isLength({ min: 1, max: 50 }),
};
