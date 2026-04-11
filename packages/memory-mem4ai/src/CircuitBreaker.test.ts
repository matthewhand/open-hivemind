import {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerState,
  clearCircuitBreakerRegistry,
  getCircuitBreaker,
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
    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(
      CircuitBreakerError
    );
  });

  it('transitions to HALF_OPEN after resetTimeoutMs', async () => {
    jest.useFakeTimers();
    const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeoutMs: 100 });
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    jest.advanceTimersByTime(100);
    expect(cb.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    jest.useRealTimers();
  });
});

describe('CircuitBreaker — HALF_OPEN state', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function openAndAdvance(cb: CircuitBreaker, ms: number) {
    await cb.execute(() => Promise.reject(new Error('e'))).catch(() => {});
    jest.advanceTimersByTime(ms);
  }

  it('closes after halfOpenMaxAttempts successes', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 100,
      halfOpenMaxAttempts: 2,
    });
    await openAndAdvance(cb, 100);
    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('re-opens on failure in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 100,
      halfOpenMaxAttempts: 3,
    });
    await openAndAdvance(cb, 100);
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    // Check internal state directly — getState() would auto-transition
    expect((cb as any).state).toBe(CircuitBreakerState.OPEN);
  });

  it('rejects after halfOpenMaxAttempts probe limit reached before success', async () => {
    const cb = new CircuitBreaker({
      name: 'test',
      failureThreshold: 1,
      resetTimeoutMs: 100,
      halfOpenMaxAttempts: 2,
    });
    await openAndAdvance(cb, 100);
    // First probe — fails, re-opens
    await expect(cb.execute(() => Promise.reject(new Error('e')))).rejects.toThrow();
    expect((cb as any).state).toBe(CircuitBreakerState.OPEN);
    // Advance past resetTimeout for HALF_OPEN again
    jest.advanceTimersByTime(100);
    // Two successes → closes
    await cb.execute(() => Promise.resolve('ok'));
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
