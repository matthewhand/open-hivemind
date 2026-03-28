/**
 * Global Error Handling Middleware for Open Hivemind
 *
 * This middleware catches all unhandled errors and formats them consistently
 * using the new error types, with proper logging and correlation tracking.
 */

import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { ErrorFactory, type BaseHivemindError } from '../types/errorClasses';
import { errorLogger } from '../utils/errorLogger';
import { createErrorResponse } from '../utils/errorResponse';
import { correlationIdMiddleware } from './correlationId';

const debug = Debug('app:error:middleware');

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
      retryCount?: number;
      maxRetries?: number;
    }
  }
}

/**
 * Error context information for logging
 */
interface ErrorContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
}

/**
 * Middleware to add correlation ID to requests.
 *
 * Delegates to the AsyncLocalStorage-backed implementation in
 * `./correlationId.ts` so the ID is available via `getCorrelationId()`
 * anywhere in the call stack without explicit parameter passing.
 */
export const correlationMiddleware = correlationIdMiddleware;

/**
 * Extract error context from request
 */
function extractErrorContext(req: Request): ErrorContext {
  const duration = req.startTime ? Date.now() - req.startTime : undefined;

  return {
    correlationId: req.correlationId || 'unknown',
    requestId: req.headers['x-request-id'] as string,
    userId: (req as import('../auth/types').AuthMiddlewareRequest).user?.id,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
    duration,
    // Sanitize sensitive data
    body: sanitizeRequestBody(req.body),
    params: req.params,
    query: req.query,
  };
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: unknown): Record<string, unknown> | unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'authorization',
    'bearer',
    'apikey',
    'api_key',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Convert error to BaseHivemindError
  const hivemindError = ErrorFactory.createError(error, {
    path: req.path,
    method: req.method,
    headers: req.headers,
  });

  const context = extractErrorContext(req);
  const includeStack = process.env.NODE_ENV === 'development';

  debug(`Global error handler: ${hivemindError.name} - ${hivemindError.message}`);

  // Log the error
  errorLogger.logError(hivemindError, context);

  // Update metrics
  MetricsCollector.getInstance().incrementErrors();

  // Determine response status
  const statusCode = hivemindError.statusCode || 500;

  // Create standard error response
  const errorResponseBuilder = createErrorResponse(
    hivemindError,
    context.correlationId
  ).withRequest(context.path, context.method, context.correlationId);

  const errorResponse = errorResponseBuilder.build();

  if (includeStack && hivemindError.stack) {
    // Inject stack trace in development mode
    errorResponse.stack = hivemindError.stack;
  }

  // Ensure correlation ID is set in response headers
  if (req.correlationId && !res.getHeader('X-Correlation-ID')) {
    res.setHeader('X-Correlation-ID', req.correlationId);
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Emit error event for monitoring
  emitErrorEvent(hivemindError, context, statusCode);
}

/**
 * Handle async errors in route handlers
 */
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
  const hivemindError = ErrorFactory.createError(error);

  errorLogger.logError(hivemindError, {
    correlationId: 'uncaught_exception',
    path: 'global',
    method: 'UNCAUGHT_EXCEPTION',
  });

  MetricsCollector.getInstance().incrementErrors();

  // In production, exit gracefully after logging
  if (process.env.NODE_ENV === 'production') {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  } else {
    // In development, re-throw for debugging
    throw error;
  }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
  const hivemindError = ErrorFactory.createError(reason);

  errorLogger.logError(hivemindError, {
    correlationId: 'unhandled_rejection',
    path: 'global',
    method: 'UNHANDLED_REJECTION',
  });

  MetricsCollector.getInstance().incrementErrors();

  // In production, exit gracefully after logging
  if (process.env.NODE_ENV === 'production') {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  } else {
    // In development, log but don't exit
    console.error('Unhandled Rejection:', reason);
  }
}

/**
 * Emit error event for monitoring systems
 */
function emitErrorEvent(error: BaseHivemindError, context: ErrorContext, statusCode: number): void {
  // Emit to any monitoring systems or event emitters
  (process as NodeJS.EventEmitter).emit('hivemind:error', {
    error: error.toJSON(),
    context,
    statusCode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Setup global error handlers
 * (Deprecated - Global process handlers are now managed centrally by ShutdownCoordinator
 * to prevent duplicate registrations and race conditions)
 */
export function setupGlobalErrorHandlers(): void {
  debug('Global error handlers setup skipped - managed by ShutdownCoordinator');
}

/**
 * Graceful shutdown handler
 * (Deprecated - Graceful shutdown is now managed centrally by ShutdownCoordinator)
 */
export function setupGracefulShutdown(): void {
  debug('Graceful shutdown handlers setup skipped - managed by ShutdownCoordinator');
}

/**
 * Error recovery middleware for retryable errors
 */
export function errorRecoveryMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if this is a retry request
  const retryCount = parseInt((req.headers['x-retry-count'] as string) || '0');
  const maxRetries = parseInt((req.headers['x-max-retries'] as string) || '3');

  if (retryCount > 0) {
    debug(`Retry request ${req.method} ${req.path} - Attempt ${retryCount}/${maxRetries}`);
  }

  // Add retry information to request
  req.retryCount = retryCount;
  req.maxRetries = maxRetries;

  next();
}

/**
 * Rate limiting error handler
 */
export function rateLimitErrorHandler(req: Request, res: Response, next: NextFunction): void {
  // This would be used with rate limiting middleware
  // to provide consistent rate limit error responses
  next();
}

export default {
  globalErrorHandler,
  correlationMiddleware,
  asyncErrorHandler,
  setupGlobalErrorHandlers,
  setupGracefulShutdown,
  errorRecoveryMiddleware,
  rateLimitErrorHandler,
};
