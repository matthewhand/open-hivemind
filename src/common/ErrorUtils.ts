import Debug from 'debug';

const debug = Debug('app:common:ErrorUtils');
export interface HivemindError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export const ErrorClassification = {
  USER_ERROR: 'user_error',
  SYSTEM_ERROR: 'system_error',
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const;

export type ErrorClassification = (typeof ErrorClassification)[keyof typeof ErrorClassification];

// Error types for enhanced error handling
export type ErrorType =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'timeout'
  | 'rate-limit'
  | 'configuration'
  | 'database'
  | 'api'
  | 'unknown';

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  retryable?: boolean;
  severity?: string;
}

export class ErrorUtils {
  /**
   * Converts an unknown error to a standardized HivemindError format.
   *
   * @param error - The error to convert.
   * @param context - Additional context information.
   * @returns A standardized HivemindError object.
   */
  public static toHivemindError(error: unknown, context?: Record<string, any>): HivemindError {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode || (error as any).status,
        originalError: error,
        context,
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        context,
      };
    }

    return {
      message: 'An unknown error occurred',
      context: { ...context, originalError: error },
    };
  }

  /**
   * Classifies an error based on its properties and context.
   *
   * @param error - The HivemindError to classify.
   * @returns An object containing the classification, log level, type, retryable status, and severity.
   */
  public static classifyError(error: HivemindError): {
    classification: ErrorClassification;
    logLevel: 'error' | 'warn' | 'info';
    type: ErrorType;
    retryable: boolean;
    severity: string;
  } {
    const msg = error.message.toLowerCase();
    const code = error.code;
    const statusCode = error.statusCode;

    // Network errors
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      msg.includes('network')
    ) {
      return {
        classification: ErrorClassification.NETWORK_ERROR,
        logLevel: 'error',
        type: 'network',
        retryable: true,
        severity: 'medium',
      };
    }

    // Timeout errors
    if (code === 'ETIMEDOUT' || msg.includes('timeout') || statusCode === 408) {
      return {
        classification: ErrorClassification.NETWORK_ERROR,
        logLevel: 'error',
        type: 'timeout',
        retryable: true,
        severity: 'medium',
      };
    }

    // Rate limit errors
    if (statusCode === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
      return {
        classification: ErrorClassification.USER_ERROR,
        logLevel: 'warn',
        type: 'rate-limit',
        retryable: true,
        severity: 'low',
      };
    }

    // Authentication errors
    if (statusCode === 401 || msg.includes('unauthorized') || msg.includes('authentication')) {
      return {
        classification: ErrorClassification.USER_ERROR,
        logLevel: 'warn',
        type: 'authentication',
        retryable: false,
        severity: 'medium',
      };
    }

    // Authorization errors
    if (statusCode === 403 || msg.includes('forbidden') || msg.includes('permission')) {
      return {
        classification: ErrorClassification.USER_ERROR,
        logLevel: 'warn',
        type: 'authorization',
        retryable: false,
        severity: 'low',
      };
    }

    // Validation errors
    if (
      code === 'VALIDATION_ERROR' ||
      statusCode === 400 ||
      msg.includes('validation') ||
      msg.includes('invalid')
    ) {
      return {
        classification: ErrorClassification.VALIDATION_ERROR,
        logLevel: 'warn',
        type: 'validation',
        retryable: false,
        severity: 'low',
      };
    }

    // Configuration errors
    if (msg.includes('config') || msg.includes('environment')) {
      return {
        classification: ErrorClassification.SYSTEM_ERROR,
        logLevel: 'error',
        type: 'configuration',
        retryable: false,
        severity: 'critical',
      };
    }

    // Database errors
    if (msg.includes('database') || msg.includes('query') || msg.includes('sql')) {
      return {
        classification: ErrorClassification.SYSTEM_ERROR,
        logLevel: 'error',
        type: 'database',
        retryable: true,
        severity: 'high',
      };
    }

    // API errors (4xx client errors)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return {
        classification: ErrorClassification.USER_ERROR,
        logLevel: 'warn',
        type: 'api',
        retryable: false,
        severity: 'low',
      };
    }

    // System errors (5xx server errors)
    if (statusCode && statusCode >= 500) {
      return {
        classification: ErrorClassification.SYSTEM_ERROR,
        logLevel: 'error',
        type: 'api',
        retryable: true,
        severity: 'high',
      };
    }

    // Default classification
    return {
      classification: ErrorClassification.UNKNOWN_ERROR,
      logLevel: 'error',
      type: 'unknown',
      retryable: false,
      severity: 'medium',
    };
  }

  /**
   * Extracts a user-friendly message from a HivemindError.
   *
   * @param error - The HivemindError to extract the message from.
   * @returns A user-friendly error message.
   */
  public static getMessage(error: HivemindError): string {
    // For user errors, return the original message
    const classification = this.classifyError(error);
    if (
      classification.classification === ErrorClassification.USER_ERROR ||
      classification.classification === ErrorClassification.VALIDATION_ERROR
    ) {
      return error.message;
    }

    // For system errors, return a generic message to avoid exposing internal details
    return 'An internal error occurred. Please try again later.';
  }

  /**
   * Gets the HTTP status code from an error
   */
  public static getStatusCode(error: HivemindError): number | undefined {
    return error.statusCode;
  }

  /**
   * Handles an error by logging it appropriately.
   * This is a legacy method for backward compatibility.
   *
   * @param error - The error to handle.
   */
  public static handleError(error: Error): void {
    const hivemindError = this.toHivemindError(error);
    const classification = this.classifyError(hivemindError);

    if (classification.logLevel === 'error') {
      debug('ERROR:', 'Application error:', hivemindError);
    } else if (classification.logLevel === 'warn') {
      debug('WARN:', 'Application warning:', hivemindError);
    } else {
      console.info('Application info:', hivemindError);
    }
  }
}
