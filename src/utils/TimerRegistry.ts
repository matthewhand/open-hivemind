import Debug from 'debug';

const debug = Debug('app:TimerRegistry');

/**
 * TimerRecord stores information about a registered timer.
 */
interface TimerRecord {
  id: string;
  handle: NodeJS.Timeout;
  type: 'timeout' | 'interval';
  callback: () => void;
  delay: number;
  createdAt: number;
  description?: string;
}

/**
 * TimerRegistry provides centralized management of all timers and intervals.
 * This ensures proper cleanup during shutdown and prevents resource leaks.
 *
 * @example
 * // Register a timeout
 * const timerId = TimerRegistry.getInstance().registerTimeout('my-timeout', () => {
 *   console.log('Timer fired');
 * }, 5000);
 *
 * // Register an interval
 * const intervalId = TimerRegistry.getInstance().registerInterval('my-interval', () => {
 *   console.log('Interval fired');
 * }, 60000);
 *
 * // Clear a specific timer
 * TimerRegistry.getInstance().clear(timerId);
 *
 * // Clear all timers on shutdown
 * TimerRegistry.getInstance().clearAll();
 */
export class TimerRegistry {
  private static instance: TimerRegistry;
  private timers = new Map<string, TimerRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly MAX_TIMERS = 1000;
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
  private readonly MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    debug('TimerRegistry initialized');
    this.startCleanupInterval();
  }

  /**
   * Get the singleton instance of TimerRegistry.
   */
  public static getInstance(): TimerRegistry {
    if (!TimerRegistry.instance) {
      TimerRegistry.instance = new TimerRegistry();
    }
    return TimerRegistry.instance;
  }

  /**
   * Register a timeout (one-shot timer).
   * @param id Unique identifier for this timer
   * @param callback Function to call when timer fires
   * @param delayMs Delay in milliseconds
   * @param description Optional description for debugging
   * @returns The timer ID
   */
  public registerTimeout(
    id: string,
    callback: () => void,
    delayMs: number,
    description?: string
  ): string {
    this.enforceMaxTimers();

    const handle = setTimeout(() => {
      this.executeAndRemove(id, callback);
    }, delayMs);

    const record: TimerRecord = {
      id,
      handle,
      type: 'timeout',
      callback,
      delay: delayMs,
      createdAt: Date.now(),
      description,
    };

    this.timers.set(id, record);
    debug(`Registered timeout: ${id} (${delayMs}ms)${description ? ` - ${description}` : ''}`);

    return id;
  }

  /**
   * Register an interval (repeating timer).
   * @param id Unique identifier for this interval
   * @param callback Function to call on each interval
   * @param intervalMs Interval in milliseconds
   * @param description Optional description for debugging
   * @returns The interval ID
   */
  public registerInterval(
    id: string,
    callback: () => void,
    intervalMs: number,
    description?: string
  ): string {
    this.enforceMaxTimers();

    const handle = setInterval(callback, intervalMs);

    const record: TimerRecord = {
      id,
      handle,
      type: 'interval',
      callback,
      delay: intervalMs,
      createdAt: Date.now(),
      description,
    };

    this.timers.set(id, record);
    debug(`Registered interval: ${id} (${intervalMs}ms)${description ? ` - ${description}` : ''}`);

    return id;
  }

  /**
   * Clear a specific timer by ID.
   * @param id The timer ID to clear
   * @returns true if the timer was found and cleared
   */
  public clear(id: string): boolean {
    const record = this.timers.get(id);
    if (!record) {
      debug(`Timer not found: ${id}`);
      return false;
    }

    if (record.type === 'timeout') {
      clearTimeout(record.handle);
    } else {
      clearInterval(record.handle);
    }

    this.timers.delete(id);
    debug(`Cleared ${record.type}: ${id}`);
    return true;
  }

  /**
   * Clear all registered timers and intervals.
   * This should be called during graceful shutdown.
   */
  public clearAll(): void {
    debug(`Clearing all timers (${this.timers.size} total)`);

    for (const [id, record] of this.timers) {
      if (record.type === 'timeout') {
        clearTimeout(record.handle);
      } else {
        clearInterval(record.handle);
      }
      debug(`Cleared ${record.type}: ${id}`);
    }

    this.timers.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get statistics about registered timers.
   */
  public getStats(): {
    total: number;
    timeouts: number;
    intervals: number;
    oldestAge: number;
  } {
    const now = Date.now();
    let timeouts = 0;
    let intervals = 0;
    let oldestAge = 0;

    for (const record of this.timers.values()) {
      if (record.type === 'timeout') {
        timeouts++;
      } else {
        intervals++;
      }
      const age = now - record.createdAt;
      if (age > oldestAge) {
        oldestAge = age;
      }
    }

    return {
      total: this.timers.size,
      timeouts,
      intervals,
      oldestAge,
    };
  }

  /**
   * Check if a timer exists.
   */
  public has(id: string): boolean {
    return this.timers.has(id);
  }

  /**
   * Get a list of all timer IDs.
   */
  public getTimerIds(): string[] {
    return Array.from(this.timers.keys());
  }

  /**
   * Execute a callback and remove the timer (for timeouts).
   */
  private executeAndRemove(id: string, callback: () => void): void {
    try {
      callback();
    } catch (error) {
      debug(`Error executing timer ${id}: ${error}`);
    } finally {
      this.timers.delete(id);
    }
  }

  /**
   * Enforce maximum timer limit to prevent memory leaks.
   */
  private enforceMaxTimers(): void {
    if (this.timers.size >= this.MAX_TIMERS) {
      // Remove oldest timers first
      const entries = [...this.timers.entries()];
      entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

      const toRemove = entries.slice(0, Math.floor(this.MAX_TIMERS * 0.1)); // Remove 10%
      for (const [id, record] of toRemove) {
        if (record.type === 'timeout') {
          clearTimeout(record.handle);
        } else {
          clearInterval(record.handle);
        }
        this.timers.delete(id);
        debug(`Removed old timer due to limit: ${id}`);
      }
    }
  }

  /**
   * Start periodic cleanup of old timers.
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldTimers();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up timers that have been running too long.
   */
  private cleanupOldTimers(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, record] of this.timers) {
      // Only clean up intervals that have been running too long
      if (record.type === 'interval' && now - record.createdAt > this.MAX_TIMER_AGE_MS) {
        toRemove.push(id);
      }
    }

    if (toRemove.length > 0) {
      debug(`Cleaning up ${toRemove.length} old intervals`);
      for (const id of toRemove) {
        this.clear(id);
      }
    }
  }

  /**
   * Reset the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    if (TimerRegistry.instance) {
      TimerRegistry.instance.clearAll();
      TimerRegistry.instance = null as any;
    }
  }
}

export default TimerRegistry;
