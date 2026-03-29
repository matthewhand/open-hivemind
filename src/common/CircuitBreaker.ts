/**
 * Circuit Breaker Pattern for External Provider Integrations
 *
 * Protects the system from cascading failures when external services
 * (LLM APIs, memory providers, tool servers) become unavailable.
 *
 * States:
 *  - CLOSED:    Normal operation. Requests pass through. Failures are counted.
 *  - OPEN:      Service is considered down. Requests are rejected immediately.
 *  - HALF_OPEN: Testing recovery. A limited number of requests are allowed through.
 */

import Debug from 'debug';

const debug = Debug('app:circuit-breaker');

// ─── Types ───────────────────────────────────────────────────────────────────

export const CircuitBreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitBreakerState = typeof CircuitBreakerState[keyof typeof CircuitBreakerState];

export interface CircuitBreakerOptions {
  /** Name used in log messages (e.g. "openai", "mem0"). */
  name: string;
  /** Number of consecutive failures before opening the circuit. Default 5. */
  failureThreshold?: number;
  /** Time in ms to wait before moving from OPEN to HALF_OPEN. Default 30 000. */
  resetTimeoutMs?: number;
  /** Max probe requests allowed in HALF_OPEN before deciding. Default 3. */
  halfOpenMaxAttempts?: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreakerError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is OPEN — requests are being rejected`);
    this.name = 'CircuitBreakerError';
  }
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private consecutiveFailures = 0;
  private halfOpenAttempts = 0;
  private halfOpenSuccesses = 0;
  private lastFailureTime: number | null = null;

  // Lifetime counters
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  private readonly _name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: CircuitBreakerOptions) {
    this._name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 3;
  }

  /**
   * Execute an async operation under circuit breaker protection.
   * Throws `CircuitBreakerError` when the circuit is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check whether an OPEN breaker should transition to HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
      } else {
        debug('[%s] Circuit is OPEN — rejecting request', this._name);
        throw new CircuitBreakerError(this._name);
      }
    }

    // In HALF_OPEN, cap the number of probe attempts
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        debug('[%s] HALF_OPEN probe limit reached — rejecting', this._name);
        throw new CircuitBreakerError(this._name);
      }
      this.halfOpenAttempts++;
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Return the current state. */
  getState(): CircuitBreakerState {
    // Lazily detect OPEN -> HALF_OPEN on read
    if (this.state === CircuitBreakerState.OPEN && this.shouldTransitionToHalfOpen()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
      this.halfOpenAttempts = 0;
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  /** Return a snapshot of internal counters. */
  getStats(): CircuitBreakerStats {
    return {
      name: this._name,
      state: this.getState(),
      failureCount: this.totalFailures,
      successCount: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /** Force-reset the breaker to CLOSED and clear all counters. */
  reset(): void {
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = null;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.transitionTo(CircuitBreakerState.CLOSED);
    debug('[%s] Circuit breaker manually reset', this._name);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private onSuccess(): void {
    this.totalSuccesses++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      // All probe attempts succeeded — close the circuit
      if (this.halfOpenSuccesses >= this.halfOpenMaxAttempts) {
        this.consecutiveFailures = 0;
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    } else {
      // CLOSED — reset consecutive failure counter
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens the circuit
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo(CircuitBreakerState.OPEN);
    }
  }

  private shouldTransitionToHalfOpen(): boolean {
    if (this.lastFailureTime === null) return false;
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;
    const prev = this.state;
    this.state = newState;
    debug('[%s] State transition: %s -> %s', this._name, prev, newState);
  }
}

// ─── Registry (singleton per provider name) ──────────────────────────────────

const registry = new Map<string, CircuitBreaker>();

/**
 * Get or create a named circuit breaker. Re-uses an existing instance when
 * called with the same name so all call-sites for a provider share state.
 */
export function getCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const existing = registry.get(options.name);
  if (existing) return existing;

  const breaker = new CircuitBreaker(options);
  registry.set(options.name, breaker);
  return breaker;
}

/**
 * Clear the global registry (useful for tests).
 */
export function clearCircuitBreakerRegistry(): void {
  registry.clear();
}
