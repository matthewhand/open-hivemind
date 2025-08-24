import Debug from 'debug';

/**
 * A standardized logging utility that provides consistent logging methods across the application.
 *
 * @module Logger
 * @description This module provides a centralized logging interface with methods for
 * different log levels including debug, info, warn, and error. Uses the 'debug' library
 * for debug logging with namespace support and console methods for other levels.
 *
 * @example
 * ```typescript
 * import { Logger } from './common/logger';
 *
 * // Create a namespaced logger
 * const logger = Logger.create('app:MyService');
 *
 * // Log messages at different levels
 * logger.debug('Debug information:', { data: 'value' });
 * logger.info('Application started successfully');
 * logger.warn('Warning message');
 * logger.error('Failed to process request:', error);
 * ```
 */

/**
 * Interface for a standardized logger instance
 */
export interface ILogger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Creates a namespaced logger instance with standardized methods
 *
 * @param namespace - The debug namespace (e.g., 'app:SlackService')
 * @returns A logger instance with debug, info, warn, and error methods
 */
function createLogger(namespace: string): ILogger {
  const debugLogger = Debug(namespace);
  
  return {
    /**
     * Logs debug messages using the debug library with namespace support
     * Only outputs when DEBUG environment variable includes the namespace
     */
    debug: (...args: any[]) => {
      debugLogger(...args);
    },

    /**
     * Logs informational messages to the console with timestamp
     */
    info: (...args: any[]) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [INFO] [${namespace}]`, ...args);
    },

    /**
     * Logs warning messages to the console with timestamp
     */
    warn: (...args: any[]) => {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [WARN] [${namespace}]`, ...args);
    },

    /**
     * Logs error messages to the console with timestamp
     */
    error: (...args: any[]) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ERROR] [${namespace}]`, ...args);
    }
  };
}

/**
 * Main Logger utility with factory method and legacy compatibility
 */
export const Logger = {
  /**
   * Creates a namespaced logger instance
   *
   * @param namespace - The debug namespace (e.g., 'app:SlackService')
   * @returns A logger instance with standardized methods
   *
   * @example
   * ```typescript
   * const logger = Logger.create('app:MyService');
   * logger.debug('Debug message');
   * logger.info('Info message');
   * ```
   */
  create: createLogger,

  /**
   * Legacy info method for backward compatibility
   * @deprecated Use Logger.create(namespace).info() instead
   */
  info: (...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO]`, ...args);
  },

  /**
   * Legacy error method for backward compatibility
   * @deprecated Use Logger.create(namespace).error() instead
   */
  error: (...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR]`, ...args);
  }
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