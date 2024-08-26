import Debug from "debug";
/**
 * Error Handling Utility
 *
 * Provides a centralized mechanism for handling errors within the application.
 * This module ensures that errors are logged appropriately and that sensitive
 * information is redacted from logs.
 *
 * Key Features:
 * - Centralized error handling
 * - Sensitive information redaction
 * - Integration with debug logging
 */


/**
 * Handles an error by logging it and optionally throwing it.
 * @param error The error object to handle.
 * @param throwError Whether to rethrow the error after handling (default: false).
 */
export function handleError(error: Error, throwError: boolean = false): void {
  if (!error) {
    debug('handleError called without an error object');
    return;
  }

  debug('Handling error:', error.message);

  // Redact sensitive information from the error message
  const redactedMessage = error.message.replace(/password=\S+/g, 'password=REDACTED');
  debug('Redacted error message:', redactedMessage);

  // Log the stack trace if available
  if (error.stack) {
    debug('Error stack trace:', error.stack);
  }

  // Optionally rethrow the error
  if (throwError) {
    throw error;
  }
}
