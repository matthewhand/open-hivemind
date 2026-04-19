import {
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerError,
  getCircuitBreaker,
  clearCircuitBreakerRegistry,
  resetAllCircuitBreakers,
} from './CircuitBreaker';

beforeEach(() => clearCircuitBreakerRegistry());

describe('CircuitBreaker — CLOSED state', () => {
  it('starts CLOSED', () => {
    const cb = new CircuitBreaker({ name: 'test' });
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('executes fn and returns result', async () => {
    const cb = new CircuitBreaker({ name: 'test' });
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('stays CLOSED after success', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3 });
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('resets consecutive failures on success', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await cb.execute(() => Promise.resolve('ok'));
    // Should still be CLOSED — success reset the counter
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});

describe('CircuitBreaker — OPEN state', () => {
  it('opens after failureThreshold consecutive failures', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeoutMs: 60000 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('rejects immediately when OPEN', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 60000 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(CircuitBreakerError);
  });

  it('transitions to HALF_OPEN after resetTimeoutMs', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 10 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    // Wait longer than resetTimeoutMs
    await new Promise((r) => setTimeout(r, 50));
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);
  });
});

describe('CircuitBreaker — HALF_OPEN state', () => {
  async function openAndWait(cb: CircuitBreaker, waitTime = 50) {
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    await new Promise((r) => setTimeout(r, waitTime));
  }

  it('closes after halfOpenMaxAttempts successes', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 10, halfOpenMaxAttempts: 2 });
    await openAndWait(cb, 50);
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('re-opens on failure in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 10, halfOpenMaxAttempts: 3 });
    await openAndWait(cb, 50);
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('rejects after halfOpenMaxAttempts probe limit reached before success', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 1000, halfOpenMaxAttempts: 2 });
    
    // Open
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    
    // Force HALF_OPEN
    (cb as any).lastFailureTime = Date.now() - 2000;
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);

    // First probe succeeds
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);

    // Second probe succeeds -> CLOSED
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});

describe('CircuitBreaker stats', () => {
  it('tracks totalRequests, totalSuccesses, totalFailures', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 5 });
    await cb.execute(() => Promise.resolve('ok'));
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    const stats = cb.getStats();
    expect(stats.totalRequests).toBe(2);
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.totalFailures).toBe(1);
  });
});

describe('CircuitBreaker reset', () => {
  it('resets to CLOSED and clears counters', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 60000 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    cb.reset();
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(cb.getStats().totalRequests).toBe(0);
  });
});
