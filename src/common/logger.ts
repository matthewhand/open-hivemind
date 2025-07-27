/**
 * A simple logging utility that provides standardized logging methods for the application.
 *
 * @module Logger
 * @description This module provides a centralized logging interface with methods for
 * different log levels. Currently supports info and error logging, with plans to extend
 * to include debug, warn, and other log levels in the future.
 *
 * @example
 * ```typescript
 * import { Logger } from './common/logger';
 *
 * // Log informational messages
 * Logger.info('Application started successfully');
 * Logger.info('User action:', { userId: 123, action: 'login' });
 *
 * // Log error messages
 * Logger.error('Failed to process request:', error);
 * ```
 */
export const Logger = {
  /**
   * Logs informational messages to the console.
   *
   * @method info
   * @param {...any[]} args - The messages or objects to log. Can be strings, objects, or any combination.
   * @returns {void}
   *
   * @example
   * ```typescript
   * Logger.info('Server listening on port 3000');
   * Logger.info('Processing request:', { method: 'GET', url: '/api/users' });
   * ```
   */
  info: (...args: any[]) => console.log(...args),

  /**
   * Logs error messages to the console.
   *
   * @method error
   * @param {...any[]} args - The error messages, error objects, or any combination to log.
   * @returns {void}
   *
   * @example
   * ```typescript
   * Logger.error('Database connection failed:', error);
   * Logger.error('Invalid user input:', { field: 'email', value: 'invalid-email' });
   * ```
   */
  error: (...args: any[]) => console.error(...args)
};

/**
 * Default export of the Logger utility for convenience.
 *
 * @default
 * @example
 * ```typescript
 * import Logger from './common/logger';
 * Logger.info('Using default export');
 * ```
 */
export default Logger;