import Debug from 'debug';

const logger = Debug('app:PerformanceMonitor');

/**
 * Performance monitoring utility for tracking operation timing
 *
 * This class provides static methods for measuring and logging
 * the performance of async and sync operations.
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
    threshold?: number
  ): Promise<T> {
    this.startTiming(label);
    try {
      const result = await operation();
      this.endTiming(label, threshold);
      return result;
    } catch (error) {
      this.endTiming(label, threshold);
      // Log the error before re-throwing
      const { ErrorHandler } = require('./ErrorHandler');
      ErrorHandler.handle(error, `Performance measurement failed: ${label}`);
      throw error;
    }
  }

  /**
   * Clear all timing data (useful for testing)
   */
  static clearTimings(): void {
    this.timings.clear();
  }

  /**
   * Get all current timings (useful for debugging)
   */
  static getTimings(): Map<string, number> {
    return new Map(this.timings);
  }
}
