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
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 1 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);
  });
});

describe('CircuitBreaker — HALF_OPEN state', () => {
  async function openAndWait(cb: CircuitBreaker, timeout = 10) {
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    await new Promise((r) => setTimeout(r, timeout + 5));
  }

  it('closes after halfOpenMaxAttempts successes', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 5, halfOpenMaxAttempts: 2 });
    await openAndWait(cb, 5);
    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('re-opens on failure in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 5, halfOpenMaxAttempts: 3 });
    await openAndWait(cb, 5);
    // Ensure it's in HALF_OPEN by calling it once
    // If it was OPEN, first call after timeout transitions to HALF_OPEN and executes
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('re-opens on failure in HALF_OPEN and then closes after successes', async () => {
    // With halfOpenMaxAttempts=2:
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 1, halfOpenMaxAttempts: 2 });
    await openAndWait(cb);

    // 1. Transition to HALF_OPEN by calling it. It fails, so it should go back to OPEN.
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    // 2. Wait for resetTimeoutMs to be eligible for HALF_OPEN again
    await new Promise((r) => setTimeout(r, 10));

    // 3. First probe in HALF_OPEN — allowed, succeeds
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);

    // 4. Second probe in HALF_OPEN — allowed, succeeds
    await cb.execute(() => Promise.resolve('ok'));
    // Since halfOpenMaxAttempts=2, after 2 successes it should CLOSE
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

describe('registry', () => {
  it('getCircuitBreaker returns same instance for same name', () => {
    const a = getCircuitBreaker({ name: 'shared' });
    const b = getCircuitBreaker({ name: 'shared' });
    expect(a).toBe(b);
  });

  it('clearCircuitBreakerRegistry creates fresh instances', () => {
    const a = getCircuitBreaker({ name: 'fresh' });
    clearCircuitBreakerRegistry();
    const b = getCircuitBreaker({ name: 'fresh' });
    expect(a).not.toBe(b);
  });

  it('resetAllCircuitBreakers resets and clears registry', async () => {
    const cb = getCircuitBreaker({ name: 'r', failureThreshold: 1, resetTimeoutMs: 60000 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    resetAllCircuitBreakers();
    const fresh = getCircuitBreaker({ name: 'r' });
    expect(fresh.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});
