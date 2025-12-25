export interface HivemindError {
  message: string;
  code?: string;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export enum ErrorClassification {
  USER_ERROR = 'user_error',
  SYSTEM_ERROR = 'system_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
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
   * @returns An object containing the classification and suggested log level.
   */
  public static classifyError(error: HivemindError): { classification: ErrorClassification; logLevel: 'error' | 'warn' | 'info' } {
    // Check for specific error codes or messages
    if (error.code === 'VALIDATION_ERROR' || error.message.toLowerCase().includes('validation')) {
      return { classification: ErrorClassification.VALIDATION_ERROR, logLevel: 'warn' };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.toLowerCase().includes('network')) {
      return { classification: ErrorClassification.NETWORK_ERROR, logLevel: 'error' };
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return { classification: ErrorClassification.USER_ERROR, logLevel: 'warn' };
    }

    if (error.statusCode && error.statusCode >= 500) {
      return { classification: ErrorClassification.SYSTEM_ERROR, logLevel: 'error' };
    }

    // Default classification
    return { classification: ErrorClassification.UNKNOWN_ERROR, logLevel: 'error' };
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
    if (classification.classification === ErrorClassification.USER_ERROR ||
        classification.classification === ErrorClassification.VALIDATION_ERROR) {
      return error.message;
    }

    // For system errors, return a generic message to avoid exposing internal details
    return 'An internal error occurred. Please try again later.';
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
      console.error('Application error:', hivemindError);
    } else if (classification.logLevel === 'warn') {
      console.warn('Application warning:', hivemindError);
    } else {
      console.info('Application info:', hivemindError);
    }
  }
}