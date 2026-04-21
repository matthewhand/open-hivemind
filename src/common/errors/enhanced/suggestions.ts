import { type ErrorContext, type ErrorType } from './types';

/**
 * Helper to determine retry delay
 */
export function getRetryDelay(error: unknown, errorType: ErrorType): number | undefined {
  // Check for Retry-After header
  const retryAfter =
    error && typeof error === 'object' && 'retryAfter' in error
      ? Number((error as any).retryAfter)
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
 * Get suggestions based on error type
 */
export function getSuggestions(
  errorType: ErrorType,
  error?: unknown,
  _context?: ErrorContext
): string[] {
  const err = error instanceof Error ? error : new Error(String(error));

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
        `Wait ${getRetryDelay(err, errorType) || 60} seconds before trying again`,
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
 * Get documentation URL for error type
 */
export function getDocsUrl(errorType: ErrorType, context?: ErrorContext): string | undefined {
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
 * Get error title for display
 */
export function getErrorTitle(errorType: ErrorType): string {
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
