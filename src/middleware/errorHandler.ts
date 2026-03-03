/**
 * Global Error Handling Middleware for Open Hivemind
 *
 * This middleware catches all unhandled errors and formats them consistently
 * using the new error types, with proper logging and correlation tracking.
 */

import crypto from 'crypto';
import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { ErrorFactory, type BaseHivemindError } from '../types/errorClasses';
import { ErrorUtils, HivemindError } from '../types/errors';
import { ErrorLogger, errorLogger } from '../utils/errorLogger';

const debug = Debug('app:error:middleware');

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
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
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  code: string;
  message?: string;
  correlationId: string;
  timestamp: string;
  details?: Record<string, unknown>;
  recovery?: {
    canRecover: boolean;
    retryDelay?: number;
    maxRetries?: number;
    steps?: string[];
  };
  stack?: string; // Only in development
}

/**
 * Middleware to add correlation ID to requests
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate correlation ID if not already present
  req.correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    generateCorrelationId();

  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Record start time for duration tracking
  req.startTime = Date.now();

  debug(`Request ${req.method} ${req.path} - Correlation ID: ${req.correlationId}`);
  next();
}

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId(): string {
  return `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Extract error context from request
 */
function extractErrorContext(req: Request): ErrorContext {
  const duration = req.startTime ? Date.now() - req.startTime : undefined;

  return {
    correlationId: req.correlationId || 'unknown',
    requestId: req.headers['x-request-id'] as string,
    userId: (req as any).user?.id || (req as any).user?.sub,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
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
function sanitizeRequestBody(body: any): any {
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
 * Create standardized error response
 */
function createErrorResponse(
  error: BaseHivemindError,
  context: ErrorContext,
  includeStack = false
): ErrorResponse {
  const recovery = error.getRecoveryStrategy();

  const response: ErrorResponse = {
    error: error.name,
    code: error.code || 'INTERNAL_ERROR',
    message: error.message,
    correlationId: context.correlationId,
    timestamp: new Date().toISOString(),
  };

  if (error.details) {
    response.details = error.details;
  }

  if (recovery) {
    response.recovery = {
      canRecover: recovery.canRecover,
      retryDelay: recovery.retryDelay,
      maxRetries: recovery.maxRetries,
      steps: recovery.recoverySteps,
    };
  }

  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
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

  // Create error response
  const errorResponse = createErrorResponse(hivemindError, context, includeStack);

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
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
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
  (process as any).emit('hivemind:error', {
    error: error.toJSON(),
    context,
    statusCode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', handleUncaughtException);

  // Handle unhandled promise rejections
  process.on('unhandledRejection', handleUnhandledRejection);

  debug('Global error handlers setup completed');
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(): void {
  const shutdown = (signal: string): void => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Close server, database connections, etc.
    // This would be implemented by the main application

    setTimeout(() => {
      console.log('Graceful shutdown completed');
      process.exit(0);
    }, 5000); // 5 second timeout
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  debug('Graceful shutdown handlers setup completed');
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
  (req as any).retryCount = retryCount;
  (req as any).maxRetries = maxRetries;

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
