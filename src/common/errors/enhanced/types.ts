/**
 * Types for Enhanced Error Handling
 */

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
