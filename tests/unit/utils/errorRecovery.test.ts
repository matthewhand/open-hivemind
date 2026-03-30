import { CircuitBreaker, FallbackManager, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '@src/utils/errorRecovery';

describe('errorRecovery', () => {
  describe('CircuitBreaker', () => {
    const config = {
      failureThreshold: 3,
      resetTimeout: 100,
      monitoringPeriod: 1000,
      expectedRecoveryTime: 500,
    };

    it('starts in closed state', () => {
      const cb = new CircuitBreaker(config);
      expect(cb.getState()).toBe('closed');
    });

    it('remains closed on successful execution', async () => {
      const cb = new CircuitBreaker(config);
      const result = await cb.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
      expect(cb.getState()).toBe('closed');
    });

    it('opens after reaching failure threshold', async () => {
      const cb = new CircuitBreaker(config);
      const fail = () => Promise.reject(new Error('fail'));

      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(cb.execute(fail)).rejects.toThrow('fail');
      }
      expect(cb.getState()).toBe('open');
    });

    it('rejects immediately when open', async () => {
      const cb = new CircuitBreaker(config);
      const fail = () => Promise.reject(new Error('fail'));

      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(cb.execute(fail)).rejects.toThrow();
      }

      await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
    });

    it('transitions to half_open after resetTimeout', async () => {
      const cb = new CircuitBreaker({ ...config, resetTimeout: 50 });
      const fail = () => Promise.reject(new Error('fail'));

      for (let i = 0; i < config.failureThreshold; i++) {
        await expect(cb.execute(fail)).rejects.toThrow();
      }
      expect(cb.getState()).toBe('open');

      await new Promise((r) => setTimeout(r, 60));
      const result = await cb.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('closed');
    });

    it('reset() returns to closed state with zero counts', () => {
      const cb = new CircuitBreaker(config);
      cb.reset();
      const stats = cb.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('getStats returns current counters', async () => {
      const cb = new CircuitBreaker(config);
      await cb.execute(() => Promise.resolve('ok'));
      const stats = cb.getStats();
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('FallbackManager', () => {
    it('executes primary operation when it succeeds', async () => {
      const fm = new FallbackManager();
      const result = await fm.executeWithFallback('op', () => Promise.resolve('primary'));
      expect(result.success).toBe(true);
      expect(result.result).toBe('primary');
      expect(result.strategy).toBe('primary');
    });

    it('falls back when primary fails', async () => {
      const fm = new FallbackManager();
      fm.registerFallback('op', () => Promise.resolve('fallback-result'));

      const result = await fm.executeWithFallback('op', () =>
        Promise.reject(new Error('primary failed'))
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback-result');
      expect(result.strategy).toBe('fallback_1');
    });

    it('reports failure when all fallbacks fail', async () => {
      const fm = new FallbackManager();
      fm.registerFallback('op', () => Promise.reject(new Error('fb1 fail')));
      fm.registerFallback('op', () => Promise.reject(new Error('fb2 fail')));

      const result = await fm.executeWithFallback('op', () =>
        Promise.reject(new Error('primary fail'))
      );
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // primary + 2 fallbacks
      expect(result.strategy).toBe('failed');
    });

    it('clearFallbacks removes registered fallbacks', () => {
      const fm = new FallbackManager();
      fm.registerFallback('op', () => Promise.resolve('fb'));
      expect(fm.getFallbacks('op')).toHaveLength(1);
      fm.clearFallbacks('op');
      expect(fm.getFallbacks('op')).toHaveLength(0);
    });

    it('clearAllFallbacks removes everything', () => {
      const fm = new FallbackManager();
      fm.registerFallback('a', () => Promise.resolve('a'));
      fm.registerFallback('b', () => Promise.resolve('b'));
      fm.clearAllFallbacks();
      expect(fm.getFallbacks('a')).toHaveLength(0);
      expect(fm.getFallbacks('b')).toHaveLength(0);
    });
  });

  describe('DEFAULT_CIRCUIT_BREAKER_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBeGreaterThan(0);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeout).toBeGreaterThan(0);
    });
  });
});
