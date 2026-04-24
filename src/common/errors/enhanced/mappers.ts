import {
  ApiError,
  AuthenticationError,
  ConfigurationError,
  NetworkError,
  RateLimitError,
  TimeoutError,
  ValidationError,
  type BaseHivemindError,
} from '../../../types/errorClasses';
import { type ErrorContext, type ErrorType } from './types';

/**
 * Map BaseHivemindError to ErrorType
 */
export function mapHivemindErrorToType(
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
export function detectErrorType(error: Error, context?: ErrorContext): ErrorType {
  const msg = error.message.toLowerCase();
  const errorCode =
    error && typeof error === 'object' && 'code' in error ? String((error as any).code) : undefined;

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
export function detectErrorTypeFromMessage(message: string, context?: ErrorContext): ErrorType {
  return detectErrorType(new Error(message), context);
}

/**
 * Get user-friendly message
 */
export function getUserFriendlyMessage(
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
 * Get HTTP status code
 */
export function getStatusCode(error: unknown, errorType: ErrorType): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return Number((error as any).statusCode);
  }

  if (error && typeof error === 'object' && 'status' in error) {
    return Number((error as any).status);
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
