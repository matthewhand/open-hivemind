/**
 * Enhanced Error Handler with Actionable Messages
 *
 * Provides user-friendly, actionable error messages with recovery suggestions
 * and retry capabilities for various error types across the application.
 */

import Debug from 'debug';
import { BaseHivemindError } from '../../types/errorClasses';
import { type LoggerInstance } from '../logger';
import {
  detectErrorType,
  detectErrorTypeFromMessage,
  getStatusCode,
  getUserFriendlyMessage,
  mapHivemindErrorToType,
} from './enhanced/mappers';
import { getDocsUrl, getErrorTitle, getRetryDelay, getSuggestions } from './enhanced/suggestions';
import { ActionableError, ErrorContext, ErrorType } from './enhanced/types';

const debug = Debug('app:errors:enhanced');

// Re-export types for backward compatibility
export { ErrorContext, ActionableError, ErrorType };

export class EnhancedErrorHandler {
  /**
   * Convert any error into an actionable error with helpful messages
   */
  static toActionableError(error: unknown, context?: ErrorContext): ActionableError {
    // If already a BaseHivemindError, extract recovery strategy
    if (error instanceof BaseHivemindError) {
      return this.fromHivemindError(error, context);
    }

    // Parse native errors
    if (error instanceof Error) {
      return this.fromNativeError(error, context);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.fromStringError(error, context);
    }

    // Unknown error type
    const errorType: ErrorType = 'unknown_error';
    return {
      message: 'An unexpected error occurred',
      errorType,
      statusCode: 500,
      details: String(error),
      suggestions: getSuggestions(errorType, error, context),
      canRetry: true,
      contactSupport: true,
    };
  }

  /**
   * Convert BaseHivemindError to ActionableError
   */
  private static fromHivemindError(
    error: BaseHivemindError,
    context?: ErrorContext
  ): ActionableError {
    const recovery = error.getRecoveryStrategy();
    const errorType = mapHivemindErrorToType(error, context);

    return {
      message: error.message,
      errorType,
      statusCode: error.statusCode,
      details: error.details ? JSON.stringify(error.details) : undefined,
      suggestions: recovery.recoverySteps || getSuggestions(errorType, error, context),
      canRetry: recovery.canRecover,
      retryAfter: recovery.retryDelay ? Math.ceil(recovery.retryDelay / 1000) : undefined,
      docsUrl: getDocsUrl(errorType, context),
      correlationId: error.correlationId,
      contactSupport: !recovery.canRecover && error.statusCode !== 400,
    };
  }

  /**
   * Convert native Error to ActionableError
   */
  private static fromNativeError(error: Error, context?: ErrorContext): ActionableError {
    const errorType = detectErrorType(error, context);
    const message = getUserFriendlyMessage(error, errorType, context);

    return {
      message,
      errorType,
      statusCode: getStatusCode(error, errorType),
      details: error.stack,
      suggestions: getSuggestions(errorType, error, context),
      canRetry: this.isRetryable(errorType),
      retryAfter: getRetryDelay(error, errorType),
      docsUrl: getDocsUrl(errorType, context),
      contactSupport: this.shouldContactSupport(errorType),
    };
  }

  /**
   * Convert string error to ActionableError
   */
  private static fromStringError(message: string, context?: ErrorContext): ActionableError {
    const errorType = detectErrorTypeFromMessage(message, context);
    const userMessage = getUserFriendlyMessage(new Error(message), errorType, context);

    return {
      message: userMessage,
      errorType,
      statusCode: getStatusCode(null, errorType),
      suggestions: getSuggestions(errorType, message, context),
      canRetry: this.isRetryable(errorType),
      docsUrl: getDocsUrl(errorType, context),
      contactSupport: this.shouldContactSupport(errorType),
    };
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryable(errorType: ErrorType): boolean {
    const retryableTypes: ErrorType[] = [
      'network_error',
      'connection_timeout',
      'rate_limit_exceeded',
      'service_unavailable',
      'marketplace_git_error',
      'tool_execution_failed',
      'provider_connection_failed',
    ];

    return retryableTypes.includes(errorType);
  }

  /**
   * Determine if user should contact support
   */
  private static shouldContactSupport(errorType: ErrorType): boolean {
    const supportTypes: ErrorType[] = [
      'marketplace_build_failed',
      'config_invalid',
      'unknown_error',
      'service_unavailable',
    ];

    return supportTypes.includes(errorType);
  }

  /**
   * Format error for display in UI
   */
  static formatForDisplay(actionableError: ActionableError): {
    title: string;
    message: string;
    actions: Array<{ label: string; action: 'retry' | 'docs' | 'support' | 'dismiss' }>;
  } {
    const actions: Array<{ label: string; action: 'retry' | 'docs' | 'support' | 'dismiss' }> = [];

    if (actionableError.canRetry) {
      const retryLabel = actionableError.retryAfter
        ? `Retry in ${actionableError.retryAfter}s`
        : 'Try Again';
      actions.push({ label: retryLabel, action: 'retry' });
    }

    if (actionableError.docsUrl) {
      actions.push({ label: 'View Documentation', action: 'docs' });
    }

    if (actionableError.contactSupport) {
      actions.push({ label: 'Contact Support', action: 'support' });
    }

    actions.push({ label: 'Dismiss', action: 'dismiss' });

    return {
      title: getErrorTitle(actionableError.errorType),
      message: actionableError.message,
      actions,
    };
  }

  /**
   * Log error with appropriate level
   */
  static logError(actionableError: ActionableError, logger?: LoggerInstance): void {
    const logData = {
      errorType: actionableError.errorType,
      message: actionableError.message,
      statusCode: actionableError.statusCode,
      correlationId: actionableError.correlationId,
      details: actionableError.details,
    };

    if (logger) {
      if (actionableError.statusCode && actionableError.statusCode >= 500) {
        logger.error('Error occurred', logData);
      } else {
        logger.warn('Error occurred', logData);
      }
    } else {
      debug('Error:', logData);
    }
  }
}
