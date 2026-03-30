import Debug from 'debug';
import { type NextFunction, type Request, type Response } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';

const debug = Debug('app:server:routes:validation:middleware');

/**
 * Helper to safely extract error response properties
 */
export function getErrorResponse(error: unknown): {
  message: string;
  code: string;
  timestamp: Date;
} {
  const message = ErrorUtils.getMessage(error);
  const code = ErrorUtils.getCode(error) || 'VALIDATION_ERROR';
  const timestamp =
    error && typeof error === 'object' && 'timestamp' in error
      ? (error.timestamp as Date)
      : new Date();

  return { message, code, timestamp };
}

/**
 * Error handler middleware
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const hivemindError = ErrorUtils.toHivemindError(
      new Error('Validation failed'),
      'Request validation failed',
      'VALIDATION_ERROR'
    );

    debug('ERROR:', 'Validation error:', hivemindError);

    const { message, code, timestamp } = getErrorResponse(hivemindError);
    const details =
      hivemindError && typeof hivemindError === 'object' && 'details' in hivemindError
        ? hivemindError.details
        : undefined;

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: message,
      code,
      details,
      timestamp,
    });
  }
  return next();
};
