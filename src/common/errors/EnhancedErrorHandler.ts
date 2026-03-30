/**
 * Enhanced Error Handler with Actionable Messages
 *
 * Provides user-friendly, actionable error messages with recovery suggestions
 * and retry capabilities for various error types across the application.
 */

import Debug from 'debug';
import {
  ApiError,
  AuthenticationError,
  BaseHivemindError,
  ConfigurationError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from '../../types/errorClasses';

const debug = Debug('app:errors:enhanced');

// ============================================================================
// Error Context Types
// ============================================================================

export interface ErrorContext {
  operation:
    | 'marketplace_install'
    | 'tool_execution'
    | 'provider_connection'
    | 'bot_operation'
    | 'general';
  component?: string;
  resourceId?: string;
  resourceType?: 'bot' | 'provider' | 'tool' | 'package' | 'server';
  userId?: string;
}

export interface ActionableError {
  /** The primary error message */
  message: string;
  /** Specific, actionable error type */
  errorType: ErrorType;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Detailed technical information (for debugging) */
  details?: string;
  /** User-friendly suggestions for resolving the error */
  suggestions: string[];
  /** Whether the operation can be retried */
  canRetry: boolean;
  /** Delay in seconds before retry (if applicable) */
  retryAfter?: number;
  /** Link to relevant documentation */
  docsUrl?: string;
  /** Unique correlation ID for tracking */
  correlationId?: string;
  /** Whether this error should show a "Contact Support" option */
  contactSupport?: boolean;
}

export type ErrorType =
  | 'network_error'
  | 'connection_timeout'
  | 'auth_invalid_key'
  | 'auth_expired'
  | 'auth_missing'
  | 'validation_required_field'
  | 'validation_invalid_format'
  | 'validation_out_of_range'
  | 'rate_limit_exceeded'
  | 'resource_not_found'
  | 'resource_already_exists'
  | 'permission_denied'
  | 'service_unavailable'
  | 'marketplace_install_failed'
  | 'marketplace_git_error'
  | 'marketplace_build_failed'
  | 'tool_execution_failed'
  | 'provider_connection_failed'
  | 'provider_not_configured'
  | 'bot_startup_failed'
  | 'config_invalid'
  | 'unknown_error';

// ============================================================================
// Error Classification and Enhancement
// ============================================================================

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
    return {
      message: 'An unexpected error occurred',
      errorType: 'unknown_error',
      statusCode: 500,
      details: String(error),
      suggestions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if the issue persists',
      ],
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
    const errorType = this.mapHivemindErrorToType(error, context);

    return {
      message: error.message,
      errorType,
      statusCode: error.statusCode,
      details: error.details ? JSON.stringify(error.details) : undefined,
      suggestions: recovery.recoverySteps || this.getDefaultSuggestions(errorType),
      canRetry: recovery.canRecover,
      retryAfter: recovery.retryDelay ? Math.ceil(recovery.retryDelay / 1000) : undefined,
      docsUrl: this.getDocsUrl(errorType, context),
      correlationId: error.correlationId,
      contactSupport: !recovery.canRecover && error.statusCode !== 400,
    };
  }

  /**
   * Convert native Error to ActionableError
   */
  private static fromNativeError(error: Error, context?: ErrorContext): ActionableError {
    const errorType = this.detectErrorType(error, context);
    const suggestions = this.getSuggestions(errorType, error, context);

    return {
      message: this.getUserFriendlyMessage(error, errorType, context),
      errorType,
      statusCode: this.getStatusCode(error, errorType),
      details: error.message,
      suggestions,
      canRetry: this.isRetryable(errorType),
      retryAfter: this.getRetryDelay(error, errorType),
      docsUrl: this.getDocsUrl(errorType, context),
      contactSupport: this.shouldContactSupport(errorType),
    };
  }

  /**
   * Convert string error to ActionableError
   */
  private static fromStringError(error: string, context?: ErrorContext): ActionableError {
    const errorType = this.detectErrorTypeFromMessage(error, context);

    return {
      message: error,
      errorType,
      statusCode: this.getStatusCode(null, errorType),
      suggestions: this.getDefaultSuggestions(errorType),
      canRetry: this.isRetryable(errorType),
      docsUrl: this.getDocsUrl(errorType, context),
      contactSupport: this.shouldContactSupport(errorType),
    };
  }

  /**
   * Map HivemindError to specific ErrorType
   */
  private static mapHivemindErrorToType(
    error: BaseHivemindError,
    context?: ErrorContext
  ): ErrorType {
    if (error instanceof NetworkError) {
      const status = error.statusCode;
      if (status === 408 || error.message.toLowerCase().includes('timeout')) {
        return 'connection_timeout';
      }
      return 'network_error';
    }

    if (error instanceof AuthenticationError) {
      if (error.reason === 'expired_token') return 'auth_expired';
      if (error.reason === 'missing_token') return 'auth_missing';
      return 'auth_invalid_key';
    }

    if (error instanceof ValidationError) {
      if (error.message.toLowerCase().includes('required')) return 'validation_required_field';
      if (error.message.toLowerCase().includes('format')) return 'validation_invalid_format';
      return 'validation_out_of_range';
    }

    if (error instanceof RateLimitError) {
      return 'rate_limit_exceeded';
    }

    if (error instanceof TimeoutError) {
      return 'connection_timeout';
    }

    if (error instanceof ApiError) {
      if (error.statusCode === 404) return 'resource_not_found';
      if (error.statusCode === 403) return 'permission_denied';
      if (error.statusCode === 503 || error.statusCode === 502) return 'service_unavailable';
      return 'network_error';
    }

    if (error instanceof ConfigurationError) {
      return 'config_invalid';
    }

    // Context-based classification
    if (context?.operation === 'marketplace_install') {
      return 'marketplace_install_failed';
    }

    if (context?.operation === 'tool_execution') {
      return 'tool_execution_failed';
    }

    if (context?.operation === 'provider_connection') {
      return 'provider_connection_failed';
    }

    if (context?.operation === 'bot_operation') {
      return 'bot_startup_failed';
    }

    return 'unknown_error';
  }

  /**
   * Detect error type from native Error
   */
  private static detectErrorType(error: Error, context?: ErrorContext): ErrorType {
    const msg = error.message.toLowerCase();
    const errorCode =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;

    // Network errors
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || msg.includes('network')) {
      return 'network_error';
    }

    if (errorCode === 'ETIMEDOUT' || msg.includes('timeout')) {
      return 'connection_timeout';
    }

    // Authentication errors
    if (msg.includes('api key') || msg.includes('apikey') || msg.includes('token')) {
      if (msg.includes('invalid') || msg.includes('incorrect')) return 'auth_invalid_key';
      if (msg.includes('expired')) return 'auth_expired';
      if (msg.includes('missing') || msg.includes('required')) return 'auth_missing';
    }

    // Validation errors
    if (msg.includes('required field') || msg.includes('is required')) {
      return 'validation_required_field';
    }

    if (msg.includes('invalid format') || msg.includes('must be')) {
      return 'validation_invalid_format';
    }

    // Rate limiting
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'rate_limit_exceeded';
    }

    // Resource errors
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return 'resource_not_found';
    }

    if (msg.includes('already exists')) {
      return 'resource_already_exists';
    }

    // Permission errors
    if (
      msg.includes('permission denied') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return 'permission_denied';
    }

    // Context-specific errors
    if (context?.operation === 'marketplace_install') {
      if (msg.includes('git')) return 'marketplace_git_error';
      if (msg.includes('build') || msg.includes('compile')) return 'marketplace_build_failed';
      return 'marketplace_install_failed';
    }

    if (context?.operation === 'tool_execution') {
      return 'tool_execution_failed';
    }

    if (context?.operation === 'provider_connection') {
      if (msg.includes('not configured')) return 'provider_not_configured';
      return 'provider_connection_failed';
    }

    if (context?.operation === 'bot_operation') {
      return 'bot_startup_failed';
    }

    return 'unknown_error';
  }

  /**
   * Detect error type from message string
   */
  private static detectErrorTypeFromMessage(message: string, context?: ErrorContext): ErrorType {
    return this.detectErrorType(new Error(message), context);
  }

  /**
   * Get user-friendly message
   */
  private static getUserFriendlyMessage(
    error: Error,
    errorType: ErrorType,
    context?: ErrorContext
  ): string {
    const operationMap: Record<string, string> = {
      marketplace_install: 'install the package',
      tool_execution: 'execute the tool',
      provider_connection: 'connect to the provider',
      bot_operation: 'start the bot',
    };

    const operation = context?.operation
      ? operationMap[context.operation] || 'complete the operation'
      : 'complete the operation';

    switch (errorType) {
      case 'network_error':
        return `Network error: Unable to ${operation}. Please check your internet connection.`;

      case 'connection_timeout':
        return `Connection timed out while trying to ${operation}. The service may be slow or unavailable.`;

      case 'auth_invalid_key':
        return `Authentication failed: Invalid API key or credentials for ${context?.resourceType || 'this service'}.`;

      case 'auth_expired':
        return `Authentication expired: Your session has expired. Please re-authenticate.`;

      case 'auth_missing':
        return `Authentication required: API key or credentials are missing for ${context?.resourceType || 'this service'}.`;

      case 'rate_limit_exceeded':
        return `Rate limit exceeded: Too many requests. Please wait before trying again.`;

      case 'validation_required_field':
        return `Validation error: Required fields are missing. Please check your input.`;

      case 'validation_invalid_format':
        return `Validation error: The provided data format is invalid.`;

      case 'marketplace_install_failed':
        return `Failed to install package: ${error.message}`;

      case 'marketplace_git_error':
        return `Git error: Unable to clone or access the repository. Check the URL and your network.`;

      case 'marketplace_build_failed':
        return `Build failed: The package could not be compiled. The package may have errors or missing dependencies.`;

      case 'tool_execution_failed':
        return `Tool execution failed: ${error.message}`;

      case 'provider_connection_failed':
        return `Failed to connect to ${context?.component || 'provider'}: ${error.message}`;

      case 'provider_not_configured':
        return `Provider not configured: ${context?.component || 'This provider'} requires configuration before use.`;

      case 'bot_startup_failed':
        return `Bot startup failed: ${error.message}`;

      case 'config_invalid':
        return `Configuration error: Invalid or missing configuration. ${error.message}`;

      case 'resource_not_found':
        return `Resource not found: The requested ${context?.resourceType || 'resource'} does not exist.`;

      case 'resource_already_exists':
        return `Resource already exists: A ${context?.resourceType || 'resource'} with this name already exists.`;

      case 'permission_denied':
        return `Permission denied: You don't have access to ${operation}.`;

      case 'service_unavailable':
        return `Service unavailable: The ${context?.component || 'service'} is currently unavailable. Please try again later.`;

      default:
        return error.message || 'An unexpected error occurred';
    }
  }

  /**
   * Get actionable suggestions based on error type
   */
  private static getSuggestions(
    errorType: ErrorType,
    error: Error,
    context?: ErrorContext
  ): string[] {
    switch (errorType) {
      case 'network_error':
        return [
          'Check your internet connection',
          'Verify that the service URL is correct',
          'Try again in a few moments',
          'Check if any firewalls are blocking the connection',
        ];

      case 'connection_timeout':
        return [
          'Check your network connection speed',
          'The service may be experiencing high load - try again later',
          'Consider increasing the timeout duration in settings',
          'Verify the service is online',
        ];

      case 'auth_invalid_key':
        return [
          'Verify your API key is correct',
          "Check that the API key hasn't been revoked",
          "Ensure you're using the right key for this environment",
          'Generate a new API key if needed',
        ];

      case 'auth_expired':
        return [
          'Log out and log back in',
          'Refresh your authentication token',
          'Check if your account is still active',
        ];

      case 'auth_missing':
        return [
          'Add your API key in the settings',
          'Configure authentication credentials',
          'Check the documentation for required authentication',
        ];

      case 'rate_limit_exceeded':
        return [
          `Wait ${this.getRetryDelay(error, errorType) || 60} seconds before trying again`,
          'Reduce the frequency of requests',
          'Consider upgrading your plan for higher rate limits',
          'Implement request queuing',
        ];

      case 'validation_required_field':
        return [
          'Fill in all required fields marked with *',
          'Check the form for empty required fields',
          'Ensure all mandatory configuration is provided',
        ];

      case 'validation_invalid_format':
        return [
          'Check the format of your input data',
          'Refer to the documentation for expected format',
          'Validate URLs, emails, and other formatted fields',
        ];

      case 'marketplace_install_failed':
        return [
          'Check the GitHub repository URL is correct',
          'Verify the package has proper manifest and structure',
          'Ensure you have internet connectivity',
          'Try again - the repository may have been temporarily unavailable',
        ];

      case 'marketplace_git_error':
        return [
          'Verify the GitHub URL is correct and accessible',
          'Check if the repository is public or you have access',
          'Ensure Git is installed on the system',
          'Try cloning the repository manually to test',
        ];

      case 'marketplace_build_failed':
        return [
          'Check the package build logs for specific errors',
          'Verify all dependencies are available',
          'The package may be incompatible with your system',
          'Report the issue to the package maintainer',
        ];

      case 'tool_execution_failed':
        return [
          'Check the tool configuration and parameters',
          'Verify the tool server is online and accessible',
          'Review tool execution logs for details',
          'Ensure you have necessary permissions',
        ];

      case 'provider_connection_failed':
        return [
          'Verify the provider credentials are correct',
          'Check the provider service status',
          'Ensure network connectivity to the provider',
          'Review provider-specific configuration requirements',
        ];

      case 'provider_not_configured':
        return [
          'Add provider configuration in Settings',
          'Follow the setup guide for this provider',
          'Ensure all required credentials are entered',
          'Test the connection after configuring',
        ];

      case 'bot_startup_failed':
        return [
          'Check bot configuration for errors',
          'Verify message provider is configured',
          'Ensure LLM provider is set up correctly',
          'Review startup logs for specific issues',
        ];

      case 'config_invalid':
        return [
          'Review configuration file for syntax errors',
          'Check environment variables are set correctly',
          'Validate configuration against schema',
          'Refer to documentation for correct format',
        ];

      case 'resource_not_found':
        return [
          'Check the resource name or ID is correct',
          'The resource may have been deleted',
          'Refresh the page to see updated resources',
          'Verify you have access to this resource',
        ];

      case 'resource_already_exists':
        return [
          'Use a different name',
          'Update the existing resource instead',
          'Delete the existing resource if appropriate',
        ];

      case 'permission_denied':
        return [
          'Contact an administrator for access',
          'Check your user role and permissions',
          "Ensure you're logged in with the correct account",
          'Request the necessary permissions',
        ];

      case 'service_unavailable':
        return [
          'Wait a few minutes and try again',
          'Check the service status page',
          'The service may be under maintenance',
          'Contact support if the issue persists',
        ];

      default:
        return [
          'Try again',
          'Refresh the page',
          'Check your internet connection',
          'Contact support if the issue persists',
        ];
    }
  }

  /**
   * Get default suggestions for error type
   */
  private static getDefaultSuggestions(errorType: ErrorType): string[] {
    return this.getSuggestions(errorType, new Error(), undefined);
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
   * Get retry delay in seconds
   */
  private static getRetryDelay(error: Error | null, errorType: ErrorType): number | undefined {
    // Check for Retry-After header
    const retryAfter =
      error && typeof error === 'object' && 'retryAfter' in error
        ? Number(error.retryAfter)
        : undefined;
    if (retryAfter) return retryAfter;

    // Default delays by error type
    switch (errorType) {
      case 'rate_limit_exceeded':
        return 60;
      case 'connection_timeout':
        return 10;
      case 'network_error':
        return 5;
      case 'service_unavailable':
        return 30;
      default:
        return undefined;
    }
  }

  /**
   * Get HTTP status code
   */
  private static getStatusCode(error: Error | null, errorType: ErrorType): number | undefined {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return Number(error.statusCode);
    }

    if (error && typeof error === 'object' && 'status' in error) {
      return Number(error.status);
    }

    switch (errorType) {
      case 'auth_invalid_key':
      case 'auth_expired':
      case 'auth_missing':
        return 401;
      case 'permission_denied':
        return 403;
      case 'resource_not_found':
        return 404;
      case 'connection_timeout':
        return 408;
      case 'resource_already_exists':
        return 409;
      case 'rate_limit_exceeded':
        return 429;
      case 'validation_required_field':
      case 'validation_invalid_format':
      case 'validation_out_of_range':
        return 400;
      case 'service_unavailable':
        return 503;
      default:
        return 500;
    }
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
   * Get documentation URL for error type
   */
  private static getDocsUrl(errorType: ErrorType, context?: ErrorContext): string | undefined {
    const baseDocsUrl = 'https://docs.open-hivemind.ai';

    switch (errorType) {
      case 'marketplace_install_failed':
      case 'marketplace_git_error':
      case 'marketplace_build_failed':
        return `${baseDocsUrl}/marketplace/troubleshooting`;

      case 'tool_execution_failed':
        return `${baseDocsUrl}/tools/troubleshooting`;

      case 'provider_connection_failed':
      case 'provider_not_configured':
        return `${baseDocsUrl}/providers/${context?.component || 'setup'}`;

      case 'bot_startup_failed':
        return `${baseDocsUrl}/bots/troubleshooting`;

      case 'auth_invalid_key':
      case 'auth_expired':
      case 'auth_missing':
        return `${baseDocsUrl}/authentication`;

      case 'rate_limit_exceeded':
        return `${baseDocsUrl}/rate-limits`;

      default:
        return undefined;
    }
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
      title: this.getErrorTitle(actionableError.errorType),
      message: actionableError.message,
      actions,
    };
  }

  /**
   * Get error title for display
   */
  private static getErrorTitle(errorType: ErrorType): string {
    switch (errorType) {
      case 'network_error':
        return 'Network Error';
      case 'connection_timeout':
        return 'Connection Timeout';
      case 'auth_invalid_key':
      case 'auth_expired':
      case 'auth_missing':
        return 'Authentication Error';
      case 'rate_limit_exceeded':
        return 'Rate Limit Exceeded';
      case 'validation_required_field':
      case 'validation_invalid_format':
      case 'validation_out_of_range':
        return 'Validation Error';
      case 'marketplace_install_failed':
      case 'marketplace_git_error':
      case 'marketplace_build_failed':
        return 'Installation Failed';
      case 'tool_execution_failed':
        return 'Tool Execution Failed';
      case 'provider_connection_failed':
      case 'provider_not_configured':
        return 'Provider Error';
      case 'bot_startup_failed':
        return 'Bot Startup Failed';
      case 'config_invalid':
        return 'Configuration Error';
      case 'permission_denied':
        return 'Permission Denied';
      case 'resource_not_found':
        return 'Not Found';
      case 'resource_already_exists':
        return 'Already Exists';
      case 'service_unavailable':
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  /**
   * Log error with appropriate level
   */
  static logError(actionableError: ActionableError, logger?: any): void {
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
