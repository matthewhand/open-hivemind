/**
 * Request Tracing Middleware
 *
 * Provides request tracing with correlation IDs for distributed tracing.
 * Injects traceId and spanId into requests and responses, and creates
 * a request-scoped logger.
 *
 * @example
 * ```typescript
 * app.use(requestTracing);
 *
 * // In route handlers:
 * req.logger.info('Processing request', { userId: req.params.id });
 * console.log('Trace ID:', req.traceId);
 * ```
 */

import {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { randomUUID } from 'crypto';
import { createLogger, type StructuredLogger } from '@src/common/StructuredLogger';

/**
 * Extended Request interface with tracing fields
 */
export interface TracedRequest extends Request {
  /**
   * Unique trace ID for request correlation
   */
  traceId: string;

  /**
   * Unique span ID for this specific operation
   */
  spanId: string;

  /**
   * Request-scoped logger with trace ID pre-attached
   */
  logger: StructuredLogger;

  /**
   * Timestamp when request was received
   */
  startTime: number;
}

/**
 * Extended Response interface with tracing fields
 */
export interface TracedResponse extends Response {
  /**
   * Trace ID that was set on the response headers
   */
  traceId?: string;
}

/**
 * Options for request tracing middleware
 */
export interface RequestTracingOptions {
  /**
   * Header name to read trace ID from (default: 'x-trace-id')
   */
  traceIdHeader?: string;

  /**
   * Header name to read span ID from (default: 'x-span-id')
   */
  spanIdHeader?: string;

  /**
   * Service name for logging (default: 'http')
   */
  serviceName?: string;

  /**
   * Whether to log request start (default: true)
   */
  logRequestStart?: boolean;

  /**
   * Whether to log request end (default: true)
   */
  logRequestEnd?: boolean;
}

/**
 * Default options for request tracing
 */
const defaultOptions: RequestTracingOptions = {
  traceIdHeader: 'x-trace-id',
  spanIdHeader: 'x-span-id',
  serviceName: 'http',
  logRequestStart: true,
  logRequestEnd: true,
};

/**
 * Generate a new trace ID
 */
function generateTraceId(): string {
  return randomUUID();
}

/**
 * Generate a new span ID
 */
function generateSpanId(): string {
  return randomUUID();
}

/**
 * Create request tracing middleware
 *
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function createRequestTracingMiddleware(
  options: RequestTracingOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const config = { ...defaultOptions, ...options };
  const baseLogger = createLogger(config.serviceName || 'http');

  return (req: Request, res: Response, next: NextFunction): void => {
    const tracedReq = req as TracedRequest;
    const tracedRes = res as TracedResponse;

    // Get or generate trace ID
    const traceId = (req.headers[config.traceIdHeader as string] as string) || generateTraceId();
    const spanId = generateSpanId();

    // Attach to request
    tracedReq.traceId = traceId;
    tracedReq.spanId = spanId;
    tracedReq.startTime = Date.now();
    tracedReq.logger = baseLogger.withTraceId(traceId);

    // Set response headers
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Span-Id', spanId);
    tracedRes.traceId = traceId;

    // Log request start
    if (config.logRequestStart) {
      tracedReq.logger.info('Request started', {
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    }

    // Log request end
    if (config.logRequestEnd) {
      const originalEnd = res.end.bind(res);
      res.end = ((...args: Parameters<typeof res.end>) => {
        const duration = Date.now() - tracedReq.startTime;

        tracedReq.logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });

        return originalEnd(...args);
      }) as typeof res.end;
    }

    next();
  };
}

/**
 * Default request tracing middleware instance
 */
export const requestTracing = createRequestTracingMiddleware();

/**
 * Helper function to get trace ID from request
 */
export function getTraceId(req: Request): string | undefined {
  return (req as TracedRequest).traceId;
}

/**
 * Helper function to get span ID from request
 */
export function getSpanId(req: Request): string | undefined {
  return (req as TracedRequest).spanId;
}

/**
 * Helper function to get request-scoped logger
 */
export function getRequestLogger(req: Request): StructuredLogger | undefined {
  return (req as TracedRequest).logger;
}

/**
 * Helper function to get request duration in milliseconds
 */
export function getRequestDuration(req: Request): number | undefined {
  const tracedReq = req as TracedRequest;
  if (tracedReq.startTime) {
    return Date.now() - tracedReq.startTime;
  }
  return undefined;
}

/**
 * Middleware to add trace ID to errors
 */
export function errorTracing(err: Error, req: Request, res: Response, next: NextFunction): void {
  const tracedReq = req as TracedRequest;

  // Attach trace ID to error if it's a HivemindError
  if ('withTraceId' in err && typeof err.withTraceId === 'function') {
    err.withTraceId(tracedReq.traceId);
  }

  // Log the error
  if (tracedReq.logger) {
    tracedReq.logger.error('Request error', err, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode || 500,
    });
  }

  next(err);
}

export default requestTracing;
