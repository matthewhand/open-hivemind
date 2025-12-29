import Debug from 'debug';

const logger = Debug('app:ErrorHandler');

/**
 * Centralized error handling utility for the Open Hivemind bot
 *
 * Provides consistent error logging, recovery strategies, and monitoring
 * across all bot operations and integrations.
 */
export class ErrorHandler {
  /**
   * Handle and log errors with context information
   *
   * @param error - The error that occurred
   * @param context - Context information about where the error occurred
   * @param severity - Error severity level (default: 'error')
   */
  static handle(error: Error | unknown, context: string, severity: 'error' | 'warn' | 'info' = 'error'): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logMessage = `[${context}] ${errorMessage}`;

    switch (severity) {
    case 'warn':
      logger(logMessage);
      console.warn(logMessage);
      break;
    case 'info':
      logger(logMessage);
      console.info(logMessage);
      break;
    default:
      logger(logMessage);
      console.error(logMessage);
      break;
    }

    // Here you could add:
    // - Error reporting to external services
    // - Metrics collection
    // - Alert notifications
    // - Error recovery strategies
  }

  /**
   * Wrap async operations with error handling
   *
   * @param operation - The async operation to wrap
   * @param context - Context for error reporting
   * @param fallback - Optional fallback value to return on error
   * @returns Promise<T | null> - Result of operation or fallback
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback: T | null = null,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /**
   * Create a safe wrapper for functions that might throw
   *
   * @param fn - Function to wrap
   * @param context - Context for error reporting
   * @returns Wrapped function that catches errors
   */
  static createSafeWrapper<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    context: string,
  ): (...args: T) => Promise<R | null> {
    return async (...args: T): Promise<R | null> => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return await result.catch(error => {
            this.handle(error, context);
            return null;
          });
        }
        return result;
      } catch (error) {
        this.handle(error, context);
        return null;
      }
    };
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private static timings = new Map<string, number>();

  /**
   * Start timing an operation
   *
   * @param label - Label for the operation
   */
  static startTiming(label: string): void {
    this.timings.set(label, Date.now());
  }

  /**
   * End timing and log the duration
   *
   * @param label - Label for the operation
   * @param threshold - Optional threshold in ms to log warnings
   */
  static endTiming(label: string, threshold?: number): void {
    const startTime = this.timings.get(label);
    if (!startTime) {
      logger(`No start time found for: ${label}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.timings.delete(label);

    const message = `${label} completed in ${duration}ms`;

    if (threshold && duration > threshold) {
      logger(`SLOW OPERATION: ${message}`);
    } else {
      logger(message);
    }
  }

  /**
   * Wrap an async operation with timing
   *
   * @param operation - Async operation to time
   * @param label - Label for timing
   * @param threshold - Optional threshold for warnings
   * @returns Promise<T> - Result of the operation
   */
  static async measureAsync<T>(
    operation: () => Promise<T>,
    label: string,
    threshold?: number,
  ): Promise<T> {
    this.startTiming(label);
    try {
      const result = await operation();
      this.endTiming(label, threshold);
      return result;
    } catch (error) {
      this.endTiming(label, threshold);
      // Log the error before re-throwing
      this.handle(error, `Performance measurement failed: ${label}`);
      throw error;
    }
  }
}