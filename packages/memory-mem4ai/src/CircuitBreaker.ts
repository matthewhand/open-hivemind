/**
 * Circuit Breaker – local copy for the mem4ai workspace package.
 *
 * This avoids importing from `@common/CircuitBreaker` which lives in the main
 * app source tree and cannot be resolved when the package is loaded from `dist/`.
 */

import Debug from 'debug';

const debug = Debug('app:circuit-breaker');

const THIRTY_SECONDS_MS = 30_000;

// ─── Types ───────────────────────────────────────────────────────────────────

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  resetTimeoutMs?: number;
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
    this.resetTimeoutMs = options.resetTimeoutMs ?? THIRTY_SECONDS_MS;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 3;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
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

  getState(): CircuitBreakerState {
    if (this.state === CircuitBreakerState.OPEN && this.shouldTransitionToHalfOpen()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
      this.halfOpenAttempts = 0;
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

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

  private onSuccess(): void {
    this.totalSuccesses++;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.halfOpenMaxAttempts) {
        this.consecutiveFailures = 0;
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.state === CircuitBreakerState.HALF_OPEN) {
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

// ─── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const existing = registry.get(options.name);
  if (existing) return existing;
  const breaker = new CircuitBreaker(options);
  registry.set(options.name, breaker);
  return breaker;
}

export function clearCircuitBreakerRegistry(): void {
  registry.clear();
}

export function resetAllCircuitBreakers(): void {
  for (const breaker of registry.values()) {
    breaker.reset();
  }
  registry.clear();
}
