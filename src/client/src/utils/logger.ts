/**
 * A simple logger utility for the client-side application.
 * It wraps the console methods and provides environment-based filtering.
 * In production, debug and info logs are suppressed to keep the console clean.
 */

const IS_DEV = import.meta.env.DEV;

export const logger = {
  /**
   * Log a debug message. Only shown in development.
   */
  debug: (...args: unknown[]) => {
    if (IS_DEV) {
      console.debug(...args);
    }
  },

  /**
   * Log an info message. Only shown in development.
   */
  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  },

  /**
   * Log a warning message. Always shown.
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Log an error message. Always shown.
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Log a general message. Only shown in development.
   * Use this as a replacement for console.log.
   */
  log: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },
};

export default logger;
