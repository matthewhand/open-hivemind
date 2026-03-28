import {
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerError,
  getCircuitBreaker,
  clearCircuitBreakerRegistry,
} from '../../src/common/CircuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    clearCircuitBreakerRegistry();
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeoutMs: 100,
      halfOpenMaxAttempts: 2,
    });
  });

  // ── State transitions ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should report zeroed stats', () => {
      const stats = breaker.getStats();
      expect(stats).toEqual({
        name: 'test',
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        consecutiveFailures: 0,
        lastFailureTime: null,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
      });
    });
  });

  describe('CLOSED state', () => {
    it('should pass through successful calls', async () => {
      const result = await breaker.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('should propagate errors from the wrapped function', async () => {
      await expect(
        breaker.execute(() => Promise.reject(new Error('boom')))
      ).rejects.toThrow('boom');
    });

    it('should count successes', async () => {
      await breaker.execute(() => Promise.resolve(1));
      await breaker.execute(() => Promise.resolve(2));
      expect(breaker.getStats().totalSuccesses).toBe(2);
    });

    it('should reset consecutive failures after a success', async () => {
      await breaker.execute(() => Promise.reject(new Error('x'))).catch(() => {});
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getStats().consecutiveFailures).toBe(0);
    });
  });

  // ── Failure threshold triggering OPEN ──────────────────────────────────

  describe('failure threshold', () => {
    it('should open the circuit after failureThreshold consecutive failures', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('should NOT open the circuit if failures are below the threshold', async () => {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reject immediately when OPEN', async () => {
      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      await expect(
        breaker.execute(() => Promise.resolve('should not run'))
      ).rejects.toThrow(CircuitBreakerError);
    });
  });

  // ── Auto-recovery to HALF_OPEN after timeout ──────────────────────────

  describe('auto-recovery to HALF_OPEN', () => {
    it('should transition to HALF_OPEN after resetTimeoutMs', async () => {
      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for the reset timeout
      await new Promise((r) => setTimeout(r, 150));

      // getState() should lazily transition
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('should allow probe requests in HALF_OPEN', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      await new Promise((r) => setTimeout(r, 150));

      // Should succeed — this is a probe
      const result = await breaker.execute(() => Promise.resolve('probe'));
      expect(result).toBe('probe');
    });
  });

  // ── Successful recovery back to CLOSED ─────────────────────────────────

  describe('recovery back to CLOSED', () => {
    it('should close the circuit after halfOpenMaxAttempts successes', async () => {
      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      await new Promise((r) => setTimeout(r, 150));

      // Two successful probes (halfOpenMaxAttempts = 2)
      await breaker.execute(() => Promise.resolve('ok'));
      await breaker.execute(() => Promise.resolve('ok'));

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reopen on any failure during HALF_OPEN', async () => {
      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }

      await new Promise((r) => setTimeout(r, 150));

      // One failure in HALF_OPEN
      await breaker.execute(() => Promise.reject(new Error('still broken'))).catch(() => {});

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  // ── Stats tracking ─────────────────────────────────────────────────────

  describe('stats tracking', () => {
    it('should track totalRequests, totalSuccesses, and totalFailures', async () => {
      await breaker.execute(() => Promise.resolve(1));
      await breaker.execute(() => Promise.resolve(2));
      await breaker.execute(() => Promise.reject(new Error('x'))).catch(() => {});

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
    });

    it('should track consecutiveFailures', async () => {
      await breaker.execute(() => Promise.reject(new Error('a'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('b'))).catch(() => {});
      expect(breaker.getStats().consecutiveFailures).toBe(2);
    });

    it('should record lastFailureTime', async () => {
      const before = Date.now();
      await breaker.execute(() => Promise.reject(new Error('x'))).catch(() => {});
      const after = Date.now();

      const stats = breaker.getStats();
      expect(stats.lastFailureTime).toBeGreaterThanOrEqual(before);
      expect(stats.lastFailureTime).toBeLessThanOrEqual(after);
    });
  });

  // ── reset() ────────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('should return the breaker to CLOSED and clear all counters', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      breaker.reset();

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.getStats().totalRequests).toBe(0);
      expect(breaker.getStats().consecutiveFailures).toBe(0);
    });
  });

  // ── Registry ───────────────────────────────────────────────────────────

  describe('getCircuitBreaker() registry', () => {
    it('should return the same instance for the same name', () => {
      const a = getCircuitBreaker({ name: 'shared', failureThreshold: 3 });
      const b = getCircuitBreaker({ name: 'shared', failureThreshold: 10 });
      expect(a).toBe(b);
    });

    it('should return different instances for different names', () => {
      const a = getCircuitBreaker({ name: 'alpha' });
      const b = getCircuitBreaker({ name: 'beta' });
      expect(a).not.toBe(b);
    });

    it('should be clearable for tests', () => {
      const before = getCircuitBreaker({ name: 'temp' });
      clearCircuitBreakerRegistry();
      const after = getCircuitBreaker({ name: 'temp' });
      expect(before).not.toBe(after);
    });
  });
});
