/**
 * Base error class for all Open-Hivemind errors.
 *
 * Provides structured error information with:
 * - Error codes for programmatic handling
 * - Categories for error classification
 * - Context data for debugging
 * - Cause chain for error wrapping
 * - JSON serialization for logging
 *
 * @example
 * ```typescript
 * throw new DatabaseNotInitializedError('Database not initialized', {
 *   attemptedOperation: 'getUser'
 * });
 * ```
 */

import { randomUUID } from 'crypto';

/**
 * Error categories for classification
 */
export type ErrorCategory = 'database' | 'network' | 'validation' | 'configuration' | 'system';

/**
 * Context information for errors
 */
export type ErrorContext = Record<string, unknown>;

/**
 * JSON representation of an error for logging
 */
export interface ErrorJSON {
  name: string;
  code: string;
  category: ErrorCategory;
  message: string;
  context: ErrorContext;
  timestamp: string;
  traceId?: string;
  cause?: ErrorJSON;
  stack?: string;
}

/**
 * Abstract base class for all Open-Hivemind errors.
 *
 * Extend this class to create domain-specific errors with
 * consistent structure and serialization.
 */
export abstract class HivemindError extends Error {
  /**
   * Unique error code for programmatic handling
   */
  abstract readonly code: string;

  /**
   * Category for error classification
   */
  abstract readonly category: ErrorCategory;

  /**
   * Additional context for debugging
   */
  readonly context: ErrorContext;

  /**
   * ISO timestamp when error was created
   */
  readonly timestamp: string;

  /**
   * Optional trace ID for request tracing
   */
  traceId?: string;

  /**
   * Original error that caused this error
   */
  cause?: Error;

  constructor(message: string, context: ErrorContext = {}, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date().toISOString();

    if (cause) {
      this.cause = cause;
    }

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Set the trace ID for request tracing
   */
  withTraceId(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): ErrorJSON {
    const json: ErrorJSON = {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };

    if (this.traceId) {
      json.traceId = this.traceId;
    }

    if (this.cause instanceof HivemindError) {
      json.cause = this.cause.toJSON();
    } else if (this.cause) {
      json.cause = {
        name: this.cause.name,
        code: 'UNKNOWN',
        category: 'system',
        message: this.cause.message,
        context: {},
        timestamp: this.timestamp,
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      json.stack = this.stack;
    }

    return json;
  }

  /**
   * Get a formatted string representation for logging
   */
  toString(): string {
    const parts = [`[${this.code}] ${this.message}`];

    if (this.traceId) {
      parts.push(`traceId=${this.traceId}`);
    }

    if (Object.keys(this.context).length > 0) {
      parts.push(`context=${JSON.stringify(this.context)}`);
    }

    return parts.join(' ');
  }
}

/**
 * Database-related errors
 */
export abstract class DatabaseError extends HivemindError {
  readonly category: ErrorCategory = 'database';
}

/**
 * Thrown when database is not initialized before use
 */

/**
 * Thrown when a database connection fails
 */

/**
 * Thrown when a database query fails
 */

/**
 * Network-related errors
 */
export abstract class NetworkError extends HivemindError {
  readonly category: ErrorCategory = 'network';
}

/**
 * Thrown when a bot is not found
 */

/**
 * Thrown when MCP server connection fails
 */

/**
 * Thrown when an external API request fails
 */
class APIError extends NetworkError {
  readonly code = 'API_ERROR';
  readonly statusCode?: number;

  constructor(message: string, context: ErrorContext = {}, statusCode?: number, cause?: Error) {
    super(message, { ...context, statusCode }, cause);
    this.statusCode = statusCode;
  }
}

/**
 * Validation-related errors
 */
export abstract class ValidationError extends HivemindError {
  readonly category: ErrorCategory = 'validation';
}

/**
 * Thrown when required configuration is missing
 */

/**
 * Thrown when input validation fails
 */

/**
 * Configuration-related errors
 */
export abstract class ConfigurationError extends HivemindError {
  readonly category: ErrorCategory = 'configuration';
}

/**
 * Thrown when configuration is invalid
 */

/**
 * System-related errors
 */
export abstract class SystemError extends HivemindError {
  readonly category: ErrorCategory = 'system';
}

/**
 * Thrown when an operation times out
 */

/**
 * Thrown when a feature is not implemented
 */

/**
 * Helper function to check if an error is a HivemindError
 */
export function isHivemindError(error: unknown): error is HivemindError {
  return error instanceof HivemindError;
}

/**
 * Helper function to get error code from any error
 */

/**
 * Helper function to get error category from any error
 */

/**
 * Generate a unique error ID for tracking
 */

/**
 * Wrap any error as a HivemindError
 */
