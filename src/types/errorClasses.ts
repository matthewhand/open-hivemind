/**
 * Enhanced error classes for Open Hivemind with recovery strategies
 * 
 * This file extends the base error types with concrete error classes
 * that include recovery mechanisms and correlation IDs for tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  AppError, 
  ErrorType} from './errors';
import { 
  ErrorClassification, 
  HivemindError, 
  ErrorUtils, 
} from './errors';

/**
 * Base error class with correlation ID and recovery capabilities
 */
export abstract class BaseHivemindError extends Error implements AppError {
  public readonly code: string;
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;
  public readonly severity: string;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType,
    code?: string,
    statusCode?: number,
    details?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code || type.toUpperCase();
    this.statusCode = statusCode;
    this.details = details;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = uuidv4();

    const classification = ErrorUtils.classifyError(this);
    this.retryable = classification.retryable;
    this.severity = classification.severity;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get the HTTP status code (alias for statusCode)
   */
  get status(): number | undefined {
    return this.statusCode;
  }

  /**
   * Get a recovery strategy for this error
   */
  abstract getRecoveryStrategy(): ErrorRecoveryStrategy;

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      statusCode: this.statusCode,
      details: this.details,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      stack: this.stack,
    };
  }
}

/**
 * Recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: () => Promise<unknown>;
  recoverySteps?: string[];
}

/**
 * Network error with retry capabilities
 */
export class NetworkError extends BaseHivemindError {
  public override readonly severity: string = 'medium';
  public readonly response?: {
    data?: unknown;
    headers?: Record<string, string>;
    status?: number;
  };
  public readonly request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };

  constructor(
    message: string,
    response?: {
      data?: unknown;
      headers?: Record<string, string>;
      status?: number;
    },
    request?: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
    },
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'network',
      'NETWORK_ERROR',
      response?.status || 503,
      { response, request },
      context,
    );
    this.response = response;
    this.request = request;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    const statusCode = this.response?.status;
    
    // Retry on server errors and rate limits
    if (!statusCode || statusCode >= 500 || statusCode === 429) {
      return {
        canRecover: true,
        maxRetries: 3,
        retryDelay: this.calculateRetryDelay(),
        recoverySteps: [
          'Check network connectivity',
          'Verify endpoint availability',
          'Retry with exponential backoff',
        ],
      };
    }

    // Don't retry client errors (4xx except 429)
    return {
      canRecover: false,
      recoverySteps: [
        'Check request parameters',
        'Verify authentication credentials',
        'Contact support if issue persists',
      ],
    };
  }

  private calculateRetryDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const jitter = Math.random() * 1000; // Random jitter up to 1 second
    return baseDelay + jitter;
  }
}

/**
 * Validation error with field-specific information
 */
export class ValidationError extends BaseHivemindError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly expected?: unknown;
  public readonly suggestions?: string[];

  constructor(
    message: string,
    details?: Record<string, unknown> | string,
    value?: unknown,
    expected?: unknown,
    suggestions?: string[],
    context?: Record<string, unknown>,
  ) {
    // Handle both old signature (message, details object) and new signature
    let field: string | undefined;
    let actualDetails: Record<string, unknown> | undefined;
    
    if (typeof details === 'object' && details !== null) {
      field = details.field as string;
      actualDetails = details;
    } else if (typeof details === 'string') {
      field = details;
    }

    super(
      message,
      'validation',
      'VALIDATION_ERROR',
      400,
      { field, value, expected, suggestions, ...actualDetails },
      context,
    );
    this.field = field;
    this.value = value;
    this.expected = expected;
    this.suggestions = suggestions;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    return {
      canRecover: false,
      recoverySteps: [
        'Check input data format',
        'Validate required fields',
        ...this.suggestions || [],
      ],
    };
  }
}

/**
 * Configuration error with environment-specific recovery
 */
export class ConfigurationError extends BaseHivemindError {
  public readonly configKey?: string;
  public readonly expectedType?: string;
  public readonly providedType?: string;
  public override readonly severity: string = 'critical';

  constructor(
    message: string,
    configKey?: string,
    expectedType?: string,
    providedType?: string,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'configuration',
      'CONFIG_ERROR',
      500,
      { configKey, expectedType, providedType },
      context,
    );
    this.configKey = configKey;
    this.expectedType = expectedType;
    this.providedType = providedType;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    return {
      canRecover: false,
      recoverySteps: [
        'Check environment variables',
        'Verify configuration file format',
        'Review documentation for required settings',
      ],
    };
  }
}

/**
 * Database error with connection retry capabilities
 */
export class DatabaseError extends BaseHivemindError {
  public readonly operation?: string;
  public readonly table?: string;
  public readonly query?: string;

  constructor(
    message: string,
    operation?: string,
    table?: string,
    query?: string,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'database',
      'DATABASE_ERROR',
      500,
      { operation, table, query },
      context,
    );
    this.operation = operation;
    this.table = table;
    this.query = query;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    // Retry on connection errors
    if (this.message.toLowerCase().includes('connection') || 
        this.message.toLowerCase().includes('timeout')) {
      return {
        canRecover: true,
        maxRetries: 3,
        retryDelay: 2000,
        recoverySteps: [
          'Check database server status',
          'Verify connection string',
          'Retry connection with backoff',
        ],
      };
    }

    return {
      canRecover: false,
      recoverySteps: [
        'Check database permissions',
        'Verify query syntax',
        'Contact database administrator',
      ],
    };
  }
}

/**
 * Authentication error with token refresh capabilities
 */
export class AuthenticationError extends BaseHivemindError {
  public readonly provider?: string;
  public readonly reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format';

  constructor(
    message: string,
    provider?: string,
    reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format',
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'authentication',
      'AUTH_ERROR',
      401,
      { provider, reason },
      context,
    );
    this.provider = provider;
    this.reason = reason;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    // Allow token refresh for expired tokens
    if (this.reason === 'expired_token') {
      return {
        canRecover: true,
        maxRetries: 1,
        retryDelay: 0,
        fallbackAction: async () => {
          // This would be implemented by the calling code
          throw new Error('Token refresh not implemented');
        },
        recoverySteps: [
          'Attempt to refresh authentication token',
          'Re-authenticate with provider',
        ],
      };
    }

    return {
      canRecover: false,
      recoverySteps: [
        'Check authentication credentials',
        'Verify token format',
        'Re-authenticate with provider',
      ],
    };
  }
}

/**
 * Authorization error with permission request
 */
export class AuthorizationError extends BaseHivemindError {
  public readonly resource?: string;
  public readonly action?: string;
  public readonly requiredPermission?: string;

  constructor(
    message: string,
    resource?: string,
    action?: string,
    requiredPermission?: string,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'authorization',
      'AUTHZ_ERROR',
      403,
      { resource, action, requiredPermission },
      context,
    );
    this.resource = resource;
    this.action = action;
    this.requiredPermission = requiredPermission;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    return {
      canRecover: false,
      recoverySteps: [
        'Request required permissions',
        'Contact administrator for access',
        'Check user role and permissions',
      ],
    };
  }
}

/**
 * Rate limit error with automatic retry
 */
export class RateLimitError extends BaseHivemindError {
  public readonly retryAfter: number;
  public readonly limit?: number;
  public readonly remaining?: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    retryAfter: number,
    limit?: number,
    remaining?: number,
    resetTime?: Date,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'rate-limit',
      'RATE_LIMIT_ERROR',
      429,
      { retryAfter, limit, remaining, resetTime },
      context,
    );
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    return {
      canRecover: true,
      maxRetries: 1,
      retryDelay: this.retryAfter * 1000, // Convert to milliseconds
      recoverySteps: [
        `Wait ${this.retryAfter} seconds before retrying`,
        'Reduce request frequency',
        'Consider implementing request queuing',
      ],
    };
  }
}

/**
 * Timeout error with retry capabilities
 */
export class TimeoutError extends BaseHivemindError {
  public readonly timeoutMs: number;
  public readonly operation?: string;

  constructor(
    message: string,
    timeoutMs: number,
    operation?: string,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'timeout',
      'TIMEOUT_ERROR',
      408,
      { timeoutMs, operation },
      context,
    );
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    return {
      canRecover: true,
      maxRetries: 2,
      retryDelay: this.timeoutMs,
      recoverySteps: [
        'Increase timeout duration',
        'Check network connectivity',
        'Verify service availability',
      ],
    };
  }
}

/**
 * API error for external service integrations
 */
export class ApiError extends BaseHivemindError {
  public readonly service: string;
  public readonly endpoint?: string;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    service: string,
    endpoint?: string,
    statusCode?: number,
    retryAfter?: number,
    context?: Record<string, unknown>,
  ) {
    super(
      message,
      'api',
      'API_ERROR',
      statusCode,
      { service, endpoint, retryAfter },
      context,
    );
    this.service = service;
    this.endpoint = endpoint;
    this.retryAfter = retryAfter;
  }

  getRecoveryStrategy(): ErrorRecoveryStrategy {
    // Retry on server errors and if retry-after is provided
    if (!this.statusCode || this.statusCode >= 500 || this.retryAfter) {
      return {
        canRecover: true,
        maxRetries: 3,
        retryDelay: this.retryAfter ? this.retryAfter * 1000 : 2000,
        recoverySteps: [
          `Check ${this.service} service status`,
          'Verify API endpoint availability',
          'Retry with exponential backoff',
        ],
      };
    }

    return {
      canRecover: false,
      recoverySteps: [
        `Check ${this.service} API documentation`,
        'Verify request format',
        'Contact service provider',
      ],
    };
  }
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
  /**
   * Create an appropriate error instance from a generic error
   */
  static createError(
    error: unknown,
    context?: Record<string, unknown>,
  ): BaseHivemindError {
    if (error instanceof BaseHivemindError) {
      return error;
    }

    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    switch (classification.type) {
    case 'network':
      return new NetworkError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).response,
        (hivemindError as any).request,
        context,
      );

    case 'validation':
      return new ValidationError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).field,
        (hivemindError as any).value,
        (hivemindError as any).expected,
        (hivemindError as any).suggestions,
        context,
      );

    case 'configuration':
      return new ConfigurationError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).configKey,
        (hivemindError as any).expectedType,
        (hivemindError as any).providedType,
        context,
      );

    case 'database':
      return new DatabaseError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).operation,
        (hivemindError as any).table,
        (hivemindError as any).query,
        context,
      );

    case 'authentication':
      return new AuthenticationError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).provider,
        (hivemindError as any).reason,
        context,
      );

    case 'authorization':
      return new AuthorizationError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).resource,
        (hivemindError as any).action,
        (hivemindError as any).requiredPermission,
        context,
      );

    case 'rate-limit':
      return new RateLimitError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).retryAfter || 60,
        (hivemindError as any).limit,
        (hivemindError as any).remaining,
        (hivemindError as any).resetTime,
        context,
      );

    case 'timeout':
      return new TimeoutError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).timeoutMs || 30000,
        (hivemindError as any).operation,
        context,
      );

    case 'api':
      return new ApiError(
        ErrorUtils.getMessage(hivemindError),
        (hivemindError as any).service || 'unknown',
        (hivemindError as any).endpoint,
        ErrorUtils.getStatusCode(hivemindError),
        (hivemindError as any).retryAfter,
        context,
      );

    default:
      // Create a generic error for unknown types
      return new ApiError(
        ErrorUtils.getMessage(hivemindError),
        'unknown',
        undefined,
        ErrorUtils.getStatusCode(hivemindError),
        undefined,
        context,
      );
    }
  }
}