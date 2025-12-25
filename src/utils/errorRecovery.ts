/**
 * Error Recovery System for Open Hivemind
 * 
 * Implements retry logic and fallback mechanisms for recoverable errors
 * with exponential backoff, circuit breakers, and adaptive strategies.
 */

import { BaseHivemindError, TimeoutError } from '../types/errorClasses';
import Debug from 'debug';

const debug = Debug('app:error:recovery');

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedRecoveryTime: number;
}

/**
 * Recovery strategy result
 */
export interface RecoveryResult<T = any> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  strategy: string;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        debug('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      debug('Circuit breaker transitioning to CLOSED');
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      debug(`Circuit breaker transitioning to OPEN after ${this.failureCount} failures`);
    }
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  /**
   * Get circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    debug('Circuit breaker reset to CLOSED');
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryHandler {
  constructor(private config: RetryConfig) {}

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<RecoveryResult<T>> {
    void context;
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        debug(`Executing operation, attempt ${attempt + 1}/${this.config.maxRetries + 1}`);
        
        const result = await operation();
        
        if (attempt > 0) {
          debug(`Operation succeeded on attempt ${attempt + 1}`);
        }

        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalDuration: Date.now() - startTime,
          strategy: 'retry',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        debug(`Operation failed on attempt ${attempt + 1}:`, lastError.message);

        // Check if error is retryable
        if (!this.isRetryableError(lastError) && attempt < this.config.maxRetries) {
          debug(`Error is not retryable: ${lastError.message}`);
          break;
        }

        // Don't wait on the last attempt
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxRetries + 1,
      totalDuration: Date.now() - startTime,
      strategy: 'retry',
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Check by error code
    if (this.config.retryableErrors.includes(error.name)) {
      return true;
    }

    // Check by status code (for HTTP errors)
    const statusCode = this.extractStatusCode(error);
    if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Check BaseHivemindError retryable flag
    if (error instanceof BaseHivemindError && error.retryable) {
      return true;
    }

    // Check error message patterns
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'service unavailable',
      'rate limit',
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Extract status code from error
   */
  private extractStatusCode(error: Error): number | undefined {
    if (error instanceof BaseHivemindError) {
      return error.statusCode;
    }

    // Try to extract from error message or properties
    const statusCodeMatch = error.message.match(/status\s*:\s*(\d+)/i);
    if (statusCodeMatch) {
      return parseInt(statusCodeMatch[1]);
    }

    return undefined;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    
    // Apply maximum delay limit
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter if enabled
    if (this.config.jitter) {
      const jitterRange = delay * 0.1;
      delay += Math.random() * jitterRange - jitterRange / 2;
    }
    
    return Math.max(0, Math.floor(delay));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Fallback mechanism manager
 */
export class FallbackManager {
  private fallbacks: Map<string, (() => Promise<any>)[]> = new Map();

  /**
   * Register fallback for an operation
   */
  registerFallback(operationKey: string, fallback: () => Promise<any>): void {
    if (!this.fallbacks.has(operationKey)) {
      this.fallbacks.set(operationKey, []);
    }
    this.fallbacks.get(operationKey)!.push(fallback);
  }

  /**
   * Execute operation with fallbacks
   */
  async executeWithFallback<T>(
    operationKey: string,
    primaryOperation: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<RecoveryResult<T>> {
    void context;
    const startTime = Date.now();
    const fallbacks = this.fallbacks.get(operationKey) || [];
    
    // Try primary operation first
    try {
      const result = await primaryOperation();
      return {
        success: true,
        result,
        attempts: 1,
        totalDuration: Date.now() - startTime,
        strategy: 'primary',
      };
    } catch (primaryError) {
      const error = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
      debug(`Primary operation failed: ${error.message}`);

      // Try fallbacks in order
      for (let i = 0; i < fallbacks.length; i++) {
        try {
          debug(`Attempting fallback ${i + 1}/${fallbacks.length}`);
          const result = await fallbacks[i]();
          
          debug(`Fallback ${i + 1} succeeded`);
          return {
            success: true,
            result,
            attempts: i + 2, // primary + this fallback
            totalDuration: Date.now() - startTime,
            strategy: `fallback_${i + 1}`,
          };
        } catch (fallbackError) {
          const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          debug(`Fallback ${i + 1} failed: ${fallbackErr.message}`);
        }
      }

      // All fallbacks failed
      return {
        success: false,
        error,
        attempts: 1 + fallbacks.length,
        totalDuration: Date.now() - startTime,
        strategy: 'failed',
      };
    }
  }

  /**
   * Get registered fallbacks for an operation
   */
  getFallbacks(operationKey: string): (() => Promise<any>)[] {
    return this.fallbacks.get(operationKey) || [];
  }

  /**
   * Clear fallbacks for an operation
   */
  clearFallbacks(operationKey: string): void {
    this.fallbacks.delete(operationKey);
  }

  /**
   * Clear all fallbacks
   */
  clearAllFallbacks(): void {
    this.fallbacks.clear();
  }
}

/**
 * Adaptive recovery manager that combines retry, circuit breaker, and fallback strategies
 */
export class AdaptiveRecoveryManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryHandlers: Map<string, RetryHandler> = new Map();
  private fallbackManagers: Map<string, FallbackManager> = new Map();

  constructor(
    private defaultRetryConfig: RetryConfig,
    private defaultCircuitBreakerConfig: CircuitBreakerConfig,
  ) {}

  /**
   * Execute operation with adaptive recovery
   */
  async execute<T>(
    operationKey: string,
    operation: () => Promise<T>,
    options: {
      enableRetry?: boolean;
      enableCircuitBreaker?: boolean;
      enableFallback?: boolean;
      retryConfig?: Partial<RetryConfig>;
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      context?: Record<string, unknown>;
    } = {},
  ): Promise<RecoveryResult<T>> {
    const {
      enableRetry = true,
      enableCircuitBreaker = true,
      enableFallback = true,
      retryConfig = {},
      circuitBreakerConfig = {},
      context = {},
    } = options;

    debug(`Executing operation ${operationKey} with adaptive recovery`);

    // Get or create handlers
    const retryHandler = this.getRetryHandler(operationKey, retryConfig);
    const circuitBreaker = this.getCircuitBreaker(operationKey, circuitBreakerConfig);
    const fallbackManager = this.getFallbackManager(operationKey);

    // Wrap operation with circuit breaker if enabled
    const protectedOperation = enableCircuitBreaker
      ? () => circuitBreaker.execute(operation)
      : operation;

    // Try with retry first
    if (enableRetry) {
      const retryResult = await retryHandler.executeWithRetry(protectedOperation, context);
      if (retryResult.success) {
        return retryResult;
      }
      debug(`Retry strategy failed for ${operationKey}`);
    } else {
      try {
        const result = await protectedOperation();
        return {
          success: true,
          result,
          attempts: 1,
          totalDuration: 0,
          strategy: 'direct',
        };
      } catch (error) {
        debug(`Direct execution failed for ${operationKey}: ${error}`);
      }
    }

    // Try fallbacks if enabled
    if (enableFallback) {
      debug(`Attempting fallbacks for ${operationKey}`);
      const fallbackResult = await fallbackManager.executeWithFallback(
        operationKey,
        operation,
        context,
      );
      
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    // All strategies failed
    return {
      success: false,
      error: new Error(`All recovery strategies failed for ${operationKey}`),
      attempts: 1,
      totalDuration: 0,
      strategy: 'failed',
    };
  }

  /**
   * Get or create retry handler
   */
  public getRetryHandler(operationKey: string, config: Partial<RetryConfig> = {}): RetryHandler {
    if (!this.retryHandlers.has(operationKey)) {
      const mergedConfig = { ...this.defaultRetryConfig, ...config };
      this.retryHandlers.set(operationKey, new RetryHandler(mergedConfig));
    }
    return this.retryHandlers.get(operationKey)!;
  }

  /**
   * Get or create circuit breaker
   */
  public getCircuitBreaker(operationKey: string, config: Partial<CircuitBreakerConfig> = {}): CircuitBreaker {
    if (!this.circuitBreakers.has(operationKey)) {
      const mergedConfig = { ...this.defaultCircuitBreakerConfig, ...config };
      this.circuitBreakers.set(operationKey, new CircuitBreaker(mergedConfig));
    }
    return this.circuitBreakers.get(operationKey)!;
  }

  /**
   * Get or create fallback manager
   */
  public getFallbackManager(operationKey: string): FallbackManager {
    if (!this.fallbackManagers.has(operationKey)) {
      this.fallbackManagers.set(operationKey, new FallbackManager());
    }
    return this.fallbackManagers.get(operationKey)!;
  }

  /**
   * Register fallback for an operation
   */
  registerFallback(operationKey: string, fallback: () => Promise<any>): void {
    this.getFallbackManager(operationKey).registerFallback(operationKey, fallback);
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats(operationKey: string) {
    const circuitBreaker = this.circuitBreakers.get(operationKey);
    return circuitBreaker ? circuitBreaker.getStats() : null;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operationKey: string): void {
    const circuitBreaker = this.circuitBreakers.get(operationKey);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }

  /**
   * Get all recovery stats
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [key, circuitBreaker] of this.circuitBreakers.entries()) {
      stats[key] = {
        circuitBreaker: circuitBreaker.getStats(),
        fallbacks: this.fallbackManagers.get(key)?.getFallbacks(key).length || 0,
      };
    }
    
    return stats;
  }
}

/**
 * Default configurations
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['NetworkError', 'TimeoutError', 'ApiError'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 10000, // 10 seconds
  expectedRecoveryTime: 30000, // 30 seconds
};

/**
 * Global recovery manager instance
 */
export const globalRecoveryManager = new AdaptiveRecoveryManager(
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
);

/**
 * Convenience instance for direct access to recovery methods
 */
export const errorRecovery = {
  withRetry: (fn: () => Promise<any>, config?: Partial<RetryConfig>) =>
    globalRecoveryManager.getRetryHandler('default', config).executeWithRetry(fn),
  withFallback: async (primary: () => Promise<any>, fallback: () => Promise<any>) => {
    const fallbackManager = globalRecoveryManager.getFallbackManager('default');
    fallbackManager.registerFallback('default', fallback);
    return fallbackManager.executeWithFallback('default', primary, {});
  },
  withCircuitBreaker: (fn: () => Promise<any>, config?: Partial<CircuitBreakerConfig>) =>
    globalRecoveryManager.getCircuitBreaker('default', config).execute(fn),
  withTimeout: async (fn: () => Promise<any>, timeoutMs: number) => {
    const startTime = Date.now();
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new TimeoutError('Operation timed out', timeoutMs)), timeoutMs),
        ),
      ]);
      return {
        success: true,
        result,
        attempts: 1,
        totalDuration: Date.now() - startTime,
        strategy: 'timeout',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: 1,
        totalDuration: Date.now() - startTime,
        strategy: 'timeout',
      };
    }
  },
};

/**
 * Convenience function to execute with recovery
 */
export async function executeWithRecovery<T>(
  operationKey: string,
  operation: () => Promise<T>,
  options?: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    enableFallback?: boolean;
    retryConfig?: Partial<RetryConfig>;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
    context?: Record<string, unknown>;
  },
): Promise<RecoveryResult<T>> {
  return globalRecoveryManager.execute(operationKey, operation, options);
}

/**
 * Register a fallback for an operation
 */
export function registerFallback(operationKey: string, fallback: () => Promise<any>): void {
  globalRecoveryManager.registerFallback(operationKey, fallback);
}

export default {
  RetryHandler,
  CircuitBreaker,
  FallbackManager,
  AdaptiveRecoveryManager,
  globalRecoveryManager,
  executeWithRecovery,
  registerFallback,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
};
