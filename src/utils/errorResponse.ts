/**
 * Error Response Utilities for Open Hivemind
 *
 * Utility functions for creating standardized error responses with proper
 * HTTP status codes, error codes, and structured data.
 */

import type { Response } from 'express';
import { BaseHivemindError } from '../types/errorClasses';
import { ErrorUtils, type HivemindError } from '../types/errors';

/**
 * Standard error response structure
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    type: string;
    correlationId?: string;
    timestamp: string;
    details?: Record<string, unknown>;
    recovery?: {
      canRecover: boolean;
      retryDelay?: number;
      maxRetries?: number;
      steps?: string[];
    };
  };
  request?: {
    path?: string;
    method?: string;
    correlationId?: string;
  };
}

/**
 * Success response structure for consistency
 */
export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    correlationId?: string;
    version?: string;
  };
}

/**
 * HTTP Status Code mappings for error types
 */
export const HTTP_STATUS_CODES = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
} as const;

/**
 * Error response builder class
 */
export class ErrorResponseBuilder {
  private response: StandardErrorResponse;

  constructor(error: HivemindError, correlationId?: string) {
    this.response = {
      success: false,
      error: {
        code: ErrorUtils.getCode(error) || 'UNKNOWN_ERROR',
        message: ErrorUtils.getMessage(error),
        type: this.getErrorType(error),
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    // Add error details if available
    if (error && typeof error === 'object' && 'details' in error) {
      this.response.error.details = error.details as Record<string, unknown>;
    }

    // Add recovery information if it's a BaseHivemindError
    if (error instanceof BaseHivemindError) {
      const recovery = error.getRecoveryStrategy();
      this.response.error.recovery = {
        canRecover: recovery.canRecover,
        retryDelay: recovery.retryDelay,
        maxRetries: recovery.maxRetries,
        steps: recovery.recoverySteps,
      };
    }
  }

  /**
   * Add request information to the error response
   */
  withRequest(path?: string, method?: string, correlationId?: string): ErrorResponseBuilder {
    this.response.request = {
      path,
      method,
      correlationId,
    };
    return this;
  }

  /**
   * Add additional details to the error response
   */
  withDetails(details: Record<string, unknown>): ErrorResponseBuilder {
    this.response.error.details = {
      ...this.response.error.details,
      ...details,
    };
    return this;
  }

  /**
   * Override the error message (useful for security in production)
   */
  withMessage(message: string): ErrorResponseBuilder {
    this.response.error.message = message;
    return this;
  }

  /**
   * Build the final error response
   */
  build(): StandardErrorResponse {
    return { ...this.response };
  }

  /**
   * Get the appropriate HTTP status code for this error
   */
  getStatusCode(): number {
    const error = this.response.error;

    // Check for specific status codes
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return HTTP_STATUS_CODES.BAD_REQUEST;
      case 'AUTH_ERROR':
        return HTTP_STATUS_CODES.UNAUTHORIZED;
      case 'AUTHZ_ERROR':
        return HTTP_STATUS_CODES.FORBIDDEN;
      case 'NOT_FOUND':
        return HTTP_STATUS_CODES.NOT_FOUND;
      case 'RATE_LIMIT_ERROR':
        return HTTP_STATUS_CODES.TOO_MANY_REQUESTS;
      case 'TIMEOUT_ERROR':
        return HTTP_STATUS_CODES.REQUEST_TIMEOUT;
      case 'CONFIG_ERROR':
        return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
      case 'DATABASE_ERROR':
        return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
      case 'NETWORK_ERROR':
        // Check if it's a client or server error
        if (error.details && typeof error.details === 'object' && 'response' in error.details) {
          const response = (error.details as any).response;
          if (response && typeof response === 'object' && 'status' in response) {
            const status = Number(response.status);
            if (status >= 400 && status < 600) {
              return status;
            }
          }
        }
        return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
      default:
        return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Extract error type from error object
   */
  private getErrorType(error: HivemindError): string {
    if (error && typeof error === 'object' && 'type' in error) {
      return String(error.type);
    }
    return 'unknown';
  }
}

/**
 * Success response builder class
 */
export class SuccessResponseBuilder<T = any> {
  private response: StandardSuccessResponse<T>;

  constructor(data: T, correlationId?: string) {
    this.response = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      },
    };
  }

  /**
   * Add metadata to the success response
   */
  withMeta(meta: Partial<StandardSuccessResponse<T>['meta']>): SuccessResponseBuilder<T> {
    this.response.meta = {
      ...this.response.meta,
      ...meta,
    } as StandardSuccessResponse<T>['meta'];
    return this;
  }

  /**
   * Build the final success response
   */
  build(): StandardSuccessResponse<T> {
    return { ...this.response };
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: HivemindError,
  correlationId?: string
): ErrorResponseBuilder {
  return new ErrorResponseBuilder(error, correlationId);
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  correlationId?: string
): SuccessResponseBuilder<T> {
  return new SuccessResponseBuilder(data, correlationId);
}

/**
 * Send error response with Express
 */
export function sendErrorResponse(
  res: Response,
  error: HivemindError,
  correlationId?: string,
  requestInfo?: { path?: string; method?: string }
): Response {
  const builder = createErrorResponse(error, correlationId);

  if (requestInfo) {
    builder.withRequest(requestInfo.path, requestInfo.method, correlationId);
  }

  const errorResponse = builder.build();
  const statusCode = builder.getStatusCode();

  // Set correlation ID header if not already set
  if (correlationId && !res.getHeader('X-Correlation-ID')) {
    res.setHeader('X-Correlation-ID', correlationId);
  }

  return res.status(statusCode).json(errorResponse);
}

/**
 * Send success response with Express
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  correlationId?: string,
  meta?: Partial<StandardSuccessResponse<T>['meta']>
): Response {
  const builder = createSuccessResponse(data, correlationId);

  if (meta) {
    builder.withMeta(meta);
  }

  const successResponse = builder.build();

  // Set correlation ID header if not already set
  if (correlationId && !res.getHeader('X-Correlation-ID')) {
    res.setHeader('X-Correlation-ID', correlationId);
  }

  return res.status(HTTP_STATUS_CODES.OK).json(successResponse);
}

/**
 * Common error response creators
 */
export const ErrorResponses = {
  /**
   * Bad request error (400)
   */
  badRequest(message: string, details?: Record<string, unknown>): ErrorResponseBuilder {
    const error = {
      code: 'BAD_REQUEST',
      message,
      type: 'validation' as const,
      details,
    };
    return createErrorResponse(error);
  },

  /**
   * Unauthorized error (401)
   */
  unauthorized(message: string = 'Authentication required'): ErrorResponseBuilder {
    const error = {
      code: 'UNAUTHORIZED',
      message,
      type: 'authentication' as const,
    };
    return createErrorResponse(error);
  },

  /**
   * Forbidden error (403)
   */
  forbidden(message: string = 'Access denied'): ErrorResponseBuilder {
    const error = {
      code: 'FORBIDDEN',
      message,
      type: 'authorization' as const,
    };
    return createErrorResponse(error);
  },

  /**
   * Not found error (404)
   */
  notFound(resource: string = 'Resource'): ErrorResponseBuilder {
    const error = {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      type: 'api' as const,
    };
    return createErrorResponse(error);
  },

  /**
   * Method not allowed error (405)
   */
  methodNotAllowed(method: string, allowedMethods: string[] = []): ErrorResponseBuilder {
    const error = {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} not allowed`,
      type: 'api' as const,
      details: { allowedMethods },
    };
    return createErrorResponse(error);
  },

  /**
   * Conflict error (409)
   */
  conflict(message: string, details?: Record<string, unknown>): ErrorResponseBuilder {
    const error = {
      code: 'CONFLICT',
      message,
      type: 'api' as const,
      details,
    };
    return createErrorResponse(error);
  },

  /**
   * Too many requests error (429)
   */
  tooManyRequests(retryAfter?: number, limit?: number): ErrorResponseBuilder {
    const error = {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded',
      type: 'rate-limit' as const,
      details: { retryAfter, limit },
    };
    return createErrorResponse(error);
  },

  /**
   * Internal server error (500)
   */
  internalServerError(message: string = 'Internal server error'): ErrorResponseBuilder {
    const error = {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      type: 'unknown' as const,
    };
    return createErrorResponse(error);
  },

  /**
   * Service unavailable error (503)
   */
  serviceUnavailable(message: string = 'Service temporarily unavailable'): ErrorResponseBuilder {
    const error = {
      code: 'SERVICE_UNAVAILABLE',
      message,
      type: 'api' as const,
    };
    return createErrorResponse(error);
  },

  /**
   * Validation error (400)
   */
  validation(
    field: string,
    value: any,
    expected: any,
    suggestions?: string[]
  ): ErrorResponseBuilder {
    const error = {
      code: 'VALIDATION_ERROR',
      message: `Validation failed for field: ${field}`,
      type: 'validation' as const,
      details: { field, value, expected, suggestions },
    };
    return createErrorResponse(error);
  },

  /**
   * Configuration error (500)
   */
  configuration(
    configKey: string,
    expectedType: string,
    providedType: string
  ): ErrorResponseBuilder {
    const error = {
      code: 'CONFIG_ERROR',
      message: `Configuration error for ${configKey}`,
      type: 'configuration' as const,
      details: { configKey, expectedType, providedType },
    };
    return createErrorResponse(error);
  },

  /**
   * Database error (500)
   */
  database(operation: string, table?: string, query?: string): ErrorResponseBuilder {
    const error = {
      code: 'DATABASE_ERROR',
      message: `Database error during ${operation}`,
      type: 'database' as const,
      details: { operation, table, query },
    };
    return createErrorResponse(error);
  },

  /**
   * Network error (500/4xx)
   */
  network(message: string, statusCode?: number, response?: any): ErrorResponseBuilder {
    const error = {
      code: 'NETWORK_ERROR',
      message,
      type: 'network' as const,
      details: { response },
    };
    return createErrorResponse(error);
  },

  /**
   * Timeout error (408)
   */
  timeout(operation: string, timeoutMs: number): ErrorResponseBuilder {
    const error = {
      code: 'TIMEOUT_ERROR',
      message: `Operation ${operation} timed out after ${timeoutMs}ms`,
      type: 'timeout' as const,
      details: { operation, timeoutMs },
    };
    return createErrorResponse(error);
  },
};

/**
 * Response utility functions for common patterns
 */
export const ResponseUtils = {
  /**
   * Send a paginated response
   */
  paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    correlationId?: string
  ): Response {
    const totalPages = Math.ceil(total / limit);

    return sendSuccessResponse(
      res,
      {
        items: data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      correlationId
    );
  },

  /**
   * Send a created response (201)
   */
  created<T>(res: Response, data: T, correlationId?: string, location?: string): Response {
    const response = createSuccessResponse(data, correlationId).build();

    if (location) {
      res.setHeader('Location', location);
    }

    if (correlationId && !res.getHeader('X-Correlation-ID')) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    return res.status(HTTP_STATUS_CODES.CREATED).json(response);
  },

  /**
   * Send an accepted response (202)
   */
  accepted<T>(res: Response, data: T, correlationId?: string): Response {
    const response = createSuccessResponse(data, correlationId).build();

    if (correlationId && !res.getHeader('X-Correlation-ID')) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    return res.status(HTTP_STATUS_CODES.ACCEPTED).json(response);
  },

  /**
   * Send a no content response (204)
   */
  noContent(res: Response, correlationId?: string): Response {
    if (correlationId && !res.getHeader('X-Correlation-ID')) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    return res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  },
};

export default {
  createErrorResponse,
  createSuccessResponse,
  sendErrorResponse,
  sendSuccessResponse,
  ErrorResponses,
  ResponseUtils,
  HTTP_STATUS_CODES,
};
