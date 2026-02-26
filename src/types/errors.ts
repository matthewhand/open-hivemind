/**
 * Comprehensive error type system for Open Hivemind
 *
 * This file provides strongly-typed error handling to replace 'any' usage
 * in catch blocks and error handling throughout the application.
 */

// Base error types
export type ErrorType =
  | 'unknown'
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'configuration'
  | 'api'
  | 'database'
  | 'rate-limit'
  | 'timeout';

/**
 * Generic error type that can be used in catch blocks to replace 'any'
 * Provides type safety while maintaining backward compatibility
 */
export type GenericError =
  | Error
  | AxiosError
  | ApiError
  | ValidationError
  | ConfigurationError
  | DatabaseError
  | unknown;

/**
 * Enhanced error interface that extends the standard Error
 */
export interface AppError extends Error {
  code: string;
  statusCode?: number;
  type: ErrorType;
  details?: Record<string, unknown>;
  retryable?: boolean;
  timestamp?: Date;
}

/**
 * Network/HTTP error type (commonly thrown by axios and fetch)
 */
export interface NetworkError extends AppError {
  type: 'network';
  statusCode: number;
  response?: {
    data?: unknown;
    headers?: Record<string, string>;
  };
  request?: {
    url?: string;
    method?: string;
  };
}

/**
 * Axios-specific error type (common in API integrations)
 */
export interface AxiosError extends Error {
  isAxiosError: boolean;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
  };
  request?: unknown;
  config?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  };
}

/**
 * API error type for external service integrations
 */
export interface ApiError extends AppError {
  type: 'api';
  service: string;
  endpoint?: string;
  statusCode?: number;
  retryAfter?: number;
}

/**
 * Validation error type
 */
export interface ValidationError extends AppError {
  type: 'validation';
  field?: string;
  value?: unknown;
  expected?: unknown;
  suggestions?: string[];
}

/**
 * Configuration error type
 */
export interface ConfigurationError extends AppError {
  type: 'configuration';
  configKey?: string;
  expectedType?: string;
  providedType?: string;
}

/**
 * Database error type
 */
export interface DatabaseError extends AppError {
  type: 'database';
  operation?: string;
  table?: string;
  query?: string;
}

/**
 * Authentication error type
 */
export interface AuthenticationError extends AppError {
  type: 'authentication';
  provider?: string;
  reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format';
}

/**
 * Authorization error type
 */
export interface AuthorizationError extends AppError {
  type: 'authorization';
  resource?: string;
  action?: string;
  requiredPermission?: string;
}

/**
 * Rate limit error type
 */
export interface RateLimitError extends AppError {
  type: 'rate-limit';
  retryAfter: number;
  limit?: number;
  remaining?: number;
  resetTime?: Date;
}

/**
 * Timeout error type
 */
export interface TimeoutError extends AppError {
  type: 'timeout';
  timeoutMs: number;
  operation?: string;
}

/**
 * Union type for all possible error types
 */
export type HivemindError =
  | AppError
  | NetworkError
  | AxiosError
  | ApiError
  | ValidationError
  | ConfigurationError
  | DatabaseError
  | AuthenticationError
  | AuthorizationError
  | RateLimitError
  | TimeoutError
  | Error
  | unknown;

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: ErrorType;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Safely extract error message from any error type
   */
  static getMessage(error: HivemindError): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }

  /**
   * Safely extract error code from any error type
   */
  static getCode(error: HivemindError): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
      return String(error.code);
    }
    return undefined;
  }

  /**
   * Safely extract status code from any error type
   */
  static getStatusCode(error: HivemindError): number | undefined {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return Number(error.statusCode);
    }
    if (this.isAxiosError(error) && error.response?.status) {
      return error.response.status;
    }
    return undefined;
  }

  /**
   * Check if error is an Axios error
   */
  static isAxiosError(error: HivemindError): error is AxiosError {
    return Boolean(
      error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError
    );
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: HivemindError): error is NetworkError {
    return (
      this.isAxiosError(error) ||
      Boolean(error && typeof error === 'object' && 'type' in error && error.type === 'network')
    );
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: HivemindError): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
      return Boolean(error.retryable);
    }

    const statusCode = this.getStatusCode(error);
    if (statusCode) {
      // Retry on server errors (5xx) and rate limits (429)
      return statusCode >= 500 || statusCode === 429;
    }

    return false;
  }

  /**
   * Classify error type and provide handling recommendations
   */
  static classifyError(error: HivemindError): ErrorClassification {
    const statusCode = this.getStatusCode(error);
    const message = this.getMessage(error).toLowerCase();

    // Rate limit errors
    if (statusCode === 429 || message.includes('rate limit')) {
      return {
        type: 'rate-limit',
        retryable: true,
        severity: 'medium',
        userMessage: 'Rate limit exceeded. Please try again later.',
        logLevel: 'warn',
      };
    }

    // Authentication errors
    if (
      statusCode === 401 ||
      message.includes('unauthorized') ||
      message.includes('invalid token')
    ) {
      return {
        type: 'authentication',
        retryable: false,
        severity: 'high',
        userMessage: 'Authentication failed. Please check your credentials.',
        logLevel: 'warn',
      };
    }

    // Authorization errors
    if (
      statusCode === 403 ||
      message.includes('forbidden') ||
      message.includes('permission denied')
    ) {
      return {
        type: 'authorization',
        retryable: false,
        severity: 'high',
        userMessage: 'Access denied. You do not have permission to perform this action.',
        logLevel: 'warn',
      };
    }

    // Network/timeout errors
    if (
      statusCode === 408 ||
      statusCode === 504 ||
      message.includes('timeout') ||
      message.includes('network')
    ) {
      return {
        type: 'timeout',
        retryable: true,
        severity: 'medium',
        userMessage: 'Request timed out. Please try again.',
        logLevel: 'warn',
      };
    }

    // Server errors
    if (statusCode && statusCode >= 500) {
      return {
        type: 'api',
        retryable: true,
        severity: 'high',
        userMessage: 'Service temporarily unavailable. Please try again later.',
        logLevel: 'error',
      };
    }

    // Client errors (4xx)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return {
        type: 'api',
        retryable: false,
        severity: 'medium',
        userMessage: 'Request failed. Please check your input and try again.',
        logLevel: 'warn',
      };
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return {
        type: 'validation',
        retryable: false,
        severity: 'low',
        userMessage: 'Invalid input. Please check your data and try again.',
        logLevel: 'info',
      };
    }

    // Configuration errors
    if (message.includes('config') || message.includes('configuration')) {
      return {
        type: 'configuration',
        retryable: false,
        severity: 'high',
        userMessage: 'Configuration error. Please contact support.',
        logLevel: 'error',
      };
    }

    // Database errors
    if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      return {
        type: 'database',
        retryable: true,
        severity: 'high',
        userMessage: 'Database error. Please try again later.',
        logLevel: 'error',
      };
    }

    // Default unknown error
    return {
      type: 'unknown',
      retryable: false,
      severity: 'medium',
      userMessage: 'An unexpected error occurred. Please try again.',
      logLevel: 'error',
    };
  }

  /**
   * Convert any error to a HivemindError
   */
  static toHivemindError(error: unknown, message?: string, type?: string): HivemindError {
    if (isHivemindError(error)) {
      return error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      'name' in error &&
      Object.prototype.toString.call(error) === '[object Error]'
    ) {
      return error as Error;
    }

    if (typeof error === 'string') {
      return this.createError(message || error);
    }

    return this.createError(
      message || 'Unknown error occurred',
      (type as ErrorType) || 'unknown',
      undefined,
      undefined,
      { originalError: error }
    );
  }

  /**
   * Create a standardized error object
   */
  static createError(
    message: string,
    type: ErrorType = 'unknown',
    code?: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ): AppError {
    const error = new Error(message) as AppError;
    error.code = code || type.toUpperCase();
    error.type = type;
    error.statusCode = statusCode;
    error.details = details;
    error.timestamp = new Date();
    error.retryable = this.classifyError(error).retryable;

    return error;
  }
}

/**
 * Type guard to check if error is a HivemindError
 */
export function isHivemindError(error: unknown): error is HivemindError {
  return Boolean(
    error instanceof Error ||
    (error && typeof error === 'object' && ('type' in error || 'code' in error))
  );
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return Boolean(
    error instanceof Error &&
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'code' in error
  );
}
