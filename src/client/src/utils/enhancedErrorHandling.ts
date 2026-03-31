/**
 * Enhanced Error Handling Utilities for Client-Side
 *
 * Provides utilities to convert API error responses into actionable error alerts
 * that can be displayed with the EnhancedErrorAlert component.
 */

import { logger } from './logger';

export interface EnhancedAPIError {
  error: string;
  message: string;
  errorType?: string;
  suggestions?: string[];
  canRetry?: boolean;
  retryAfter?: number;
  docsUrl?: string;
  correlationId?: string;
  contactSupport?: boolean;
  details?: string;
  statusCode?: number;
}

export interface ActionableErrorDisplay {
  title: string;
  message: string;
  errorType: 'error' | 'warning' | 'info';
  suggestions: string[];
  canRetry: boolean;
  retryAfter?: number;
  docsUrl?: string;
  contactSupport: boolean;
  correlationId?: string;
  details?: string;
}

/**
 * Convert an API error response to an actionable error display
 */
export function convertAPIErrorToDisplay(
  error: any,
  defaultTitle: string = 'Error Occurred'
): ActionableErrorDisplay {
  // If the error response contains enhanced error information
  if (error.errorType && error.suggestions) {
    return {
      title: getErrorTitle(error.errorType),
      message: error.message || error.error || 'An error occurred',
      errorType: getDisplayErrorType(error.errorType),
      suggestions: error.suggestions || [],
      canRetry: error.canRetry || false,
      retryAfter: error.retryAfter,
      docsUrl: error.docsUrl,
      contactSupport: error.contactSupport || false,
      correlationId: error.correlationId,
      details: error.details || getErrorDetails(error),
    };
  }

  // Fallback for non-enhanced errors
  return createFallbackError(error, defaultTitle);
}

/**
 * Get a user-friendly title for error type
 */
function getErrorTitle(errorType: string): string {
  const titles: Record<string, string> = {
    network_error: 'Network Error',
    marketplace_install_failed: 'Installation Failed',
    marketplace_git_error: 'Git Repository Error',
    marketplace_build_failed: 'Build Failed',
    tool_execution_failed: 'Tool Execution Failed',
    provider_connection_failed: 'Connection Failed',
    provider_not_configured: 'Configuration Required',
    bot_startup_failed: 'Bot Startup Failed',
    auth_invalid_key: 'Invalid API Key',
    auth_expired: 'Authentication Expired',
    auth_missing: 'Authentication Required',
    validation_error: 'Validation Error',
    validation_required_field: 'Missing Required Fields',
    validation_invalid_format: 'Invalid Format',
    rate_limit_exceeded: 'Rate Limit Exceeded',
    config_invalid: 'Configuration Error',
    resource_not_found: 'Not Found',
    resource_already_exists: 'Already Exists',
    permission_denied: 'Permission Denied',
    service_unavailable: 'Service Unavailable',
  };

  return titles[errorType] || 'Error Occurred';
}

/**
 * Map error type to display severity
 */
function getDisplayErrorType(errorType: string): 'error' | 'warning' | 'info' {
  const warningTypes = [
    'validation_error',
    'validation_required_field',
    'validation_invalid_format',
    'rate_limit_exceeded',
    'resource_already_exists',
  ];

  if (warningTypes.includes(errorType)) {
    return 'warning';
  }

  return 'error';
}

/**
 * Extract error details for technical display
 */
function getErrorDetails(error: any): string | undefined {
  if (typeof error === 'string') {
    return error;
  }

  if (error.details) {
    return typeof error.details === 'string'
      ? error.details
      : JSON.stringify(error.details, null, 2);
  }

  if (error.stack) {
    return error.stack;
  }

  if (error.message) {
    return error.message;
  }

  return undefined;
}

/**
 * Create a fallback error display for non-enhanced errors
 */
function createFallbackError(error: any, defaultTitle: string): ActionableErrorDisplay {
  const message = error.message || error.error || 'An unexpected error occurred';
  const statusCode = error.statusCode || error.status;

  // Detect error type from message and status code
  let errorType: 'error' | 'warning' | 'info' = 'error';
  let canRetry = false;
  const suggestions: string[] = [];
  let docsUrl: string | undefined;

  // Network errors
  if (message.includes('network') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    suggestions.push('Check your internet connection');
    suggestions.push('Verify the service URL is correct');
    suggestions.push('Try again in a few moments');
    canRetry = true;
  }
  // Authentication errors
  else if (statusCode === 401 || message.includes('unauthorized') || message.includes('authentication')) {
    suggestions.push('Check your API key or credentials');
    suggestions.push('Log out and log back in');
    suggestions.push('Verify your session hasn\'t expired');
  }
  // Validation errors
  else if (statusCode === 400 || message.includes('validation') || message.includes('invalid')) {
    errorType = 'warning';
    suggestions.push('Check your input data');
    suggestions.push('Verify all required fields are filled');
    suggestions.push('Review the format of your data');
  }
  // Rate limiting
  else if (statusCode === 429 || message.includes('rate limit')) {
    errorType = 'warning';
    suggestions.push('Wait a moment before trying again');
    suggestions.push('Reduce the frequency of requests');
    canRetry = true;
  }
  // Server errors
  else if (statusCode && statusCode >= 500) {
    suggestions.push('The service may be temporarily unavailable');
    suggestions.push('Try again in a few moments');
    suggestions.push('Contact support if the issue persists');
    canRetry = true;
  }
  // Default suggestions
  else {
    suggestions.push('Try again');
    suggestions.push('Refresh the page');
    suggestions.push('Contact support if the issue persists');
  }

  return {
    title: defaultTitle,
    message,
    errorType,
    suggestions,
    canRetry,
    docsUrl,
    contactSupport: statusCode && statusCode >= 500,
    details: getErrorDetails(error),
  };
}

/**
 * Hook for handling API errors with enhanced error display
 */
export function useEnhancedErrorHandling() {
  const handleError = (
    error: any,
    defaultTitle: string = 'Error Occurred'
  ): ActionableErrorDisplay => {
    // Log error for debugging
    logger.error('[EnhancedErrorHandling] Error occurred:', error);

    return convertAPIErrorToDisplay(error, defaultTitle);
  };

  return { handleError };
}
