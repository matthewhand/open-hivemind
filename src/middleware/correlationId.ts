/**
 * Correlation ID Middleware with AsyncLocalStorage
 *
 * Provides request-scoped correlation IDs for distributed tracing.
 * Uses AsyncLocalStorage so that any code in the request call stack
 * can retrieve the correlation ID without explicit parameter passing.
 *
 * @example
 * ```typescript
 * import { getCorrelationId } from '@src/middleware/correlationId';
 *
 * // Anywhere in a request call stack:
 * const id = getCorrelationId(); // returns the current request's correlation ID
 * ```
 */

import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Store holding the correlation context for the current async scope.
 */
export interface CorrelationContext {
  correlationId: string;
  startTime: number;
}

/**
 * AsyncLocalStorage instance scoped to the module so every import
 * shares the same store.
 */
export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Generate a unique correlation ID.
 *
 * Format: `corr_<epoch>_<16 hex chars>` for easy visual identification
 * in logs while still being unique enough for production use.
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Express middleware that:
 * 1. Extracts `X-Correlation-ID` (or `X-Request-ID`) from incoming headers,
 *    or generates a new one when absent.
 * 2. Attaches the ID to `req.correlationId`.
 * 3. Sets the `X-Correlation-ID` response header.
 * 4. Wraps the remaining middleware chain inside AsyncLocalStorage so that
 *    `getCorrelationId()` works anywhere downstream.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    generateCorrelationId();

  // Attach to the Express request object (uses the global augmentation
  // declared in errorHandler.ts).
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Set response header so callers can correlate responses.
  res.setHeader('X-Correlation-ID', correlationId);

  const context: CorrelationContext = {
    correlationId,
    startTime: req.startTime,
  };

  // Run the rest of the middleware chain inside the async local store.
  correlationStorage.run(context, () => {
    next();
  });
}

/**
 * Retrieve the correlation ID for the current request from AsyncLocalStorage.
 *
 * Returns `undefined` when called outside a request context (e.g. during
 * startup or in a detached background job).
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Retrieve the full correlation context for the current request.
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

export default correlationIdMiddleware;
