import { CircuitBreaker, FallbackManager, DEFAULT_CIRCUIT_BREAKER_CONFIG, RetryHandler, DEFAULT_RETRY_CONFIG, AdaptiveRecoveryManager, globalRecoveryManager, errorRecovery, executeWithRecovery, registerFallback } from '@src/utils/errorRecovery';
import { BaseHivemindError, TimeoutError } from '@src/types/errorClasses';

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

  describe('RetryHandler', () => {
    const config = {
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
      retryableErrors: ['NetworkError', 'TimeoutError'],
      retryableStatusCodes: [500, 503],
    };

    it('returns result on first try if successful', async () => {
      const rh = new RetryHandler(config);
      const result = await rh.executeWithRetry(() => Promise.resolve('success'));
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.strategy).toBe('retry');
    });

    it('retries on retryable error (by name)', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        if (attempts < 3) {
          const err = new Error('fail');
          err.name = 'NetworkError';
          throw err;
        }
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
    });

    it('retries on retryable status code', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          const err = new Error('status: 503');
          throw err;
        }
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('retries on BaseHivemindError with retryable=true', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          class CustomError extends BaseHivemindError {
            constructor() {
              super('custom', 500, 'CUSTOM_ERROR');
              this.retryable = true;
            }
          }
          throw new CustomError();
        }
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('retries on error message pattern', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Connection reset by peer');
        }
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('stops retrying on non-retryable error', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        throw new Error('Fatal error, not retryable');
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.error?.message).toBe('Fatal error, not retryable');
      expect(attempts).toBe(1);
    });

    it('exhausts all retries and fails', async () => {
      const rh = new RetryHandler(config);
      let attempts = 0;
      const result = await rh.executeWithRetry(async () => {
        attempts++;
        const err = new Error('fail');
        err.name = 'NetworkError';
        throw err;
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // initial + 3 retries
      expect(result.error?.name).toBe('NetworkError');
      expect(attempts).toBe(4);
    });

    it('calculates delay with jitter correctly', async () => {
      const jitterConfig = { ...config, jitter: true, maxRetries: 1 };
      const rh = new RetryHandler(jitterConfig);
      let attempts = 0;
      const startTime = Date.now();

      await rh.executeWithRetry(async () => {
        attempts++;
        if (attempts === 1) {
          const err = new Error('fail');
          err.name = 'NetworkError';
          throw err;
        }
        return 'success';
      });

      const duration = Date.now() - startTime;
      // baseDelay is 10. With multiplier 2^0 = 1 => 10ms.
      // Jitter is +/- 5% (0.5ms). So delay is ~10ms.
      expect(duration).toBeGreaterThanOrEqual(5);
    });

    it('handles non-Error objects thrown', async () => {
      const rh = new RetryHandler(config);
      const result = await rh.executeWithRetry(async () => {
        throw 'string error';
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });

  describe('AdaptiveRecoveryManager', () => {
    let arm: AdaptiveRecoveryManager;

    beforeEach(() => {
      arm = new AdaptiveRecoveryManager(
        { ...DEFAULT_RETRY_CONFIG, baseDelay: 1, maxRetries: 1 },
        { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 2, resetTimeout: 100 }
      );
    });

    it('executes directly if retry, circuit breaker, and fallback disabled', async () => {
      const result = await arm.execute('test', () => Promise.resolve('ok'), {
        enableRetry: false,
        enableCircuitBreaker: false,
        enableFallback: false,
      });
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct');
    });

    it('fails directly if retry, circuit breaker, and fallback disabled', async () => {
      const result = await arm.execute('test', () => Promise.reject(new Error('fail')), {
        enableRetry: false,
        enableCircuitBreaker: false,
        enableFallback: false,
      });
      expect(result.success).toBe(false);
      expect(result.strategy).toBe('failed');
    });

    it('uses retry if enabled', async () => {
      let attempts = 0;
      const result = await arm.execute('test', async () => {
        attempts++;
        if (attempts === 1) throw new Error('timeout');
        return 'ok';
      }, { enableRetry: true, enableFallback: false });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.strategy).toBe('retry');
    });

    it('uses fallback if retry fails', async () => {
      arm.registerFallback('test', () => Promise.resolve('fallback-ok'));

      const result = await arm.execute('test', () => Promise.reject(new Error('timeout')), {
        enableRetry: true,
        enableFallback: true,
        retryConfig: { maxRetries: 0 }
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback-ok');
      expect(result.strategy).toBe('fallback_1');
    });

    it('updates circuit breaker stats', async () => {
      await arm.execute('test', () => Promise.resolve('ok'));
      const stats = arm.getCircuitBreakerStats('test');
      expect(stats?.successCount).toBe(1);
    });

    it('reset circuit breaker works', async () => {
      await arm.execute('test', () => Promise.resolve('ok'));
      arm.resetCircuitBreaker('test');
      const stats = arm.getCircuitBreakerStats('test');
      expect(stats?.state).toBe('closed');
    });

    it('getAllStats returns combined stats', async () => {
      await arm.execute('test1', () => Promise.resolve('ok'));
      arm.registerFallback('test2', () => Promise.resolve('ok'));
      await arm.execute('test2', () => Promise.resolve('ok'));

      const stats = arm.getAllStats();
      expect(stats['test1']).toBeDefined();
      expect(stats['test2'].fallbacks).toBe(1);
    });

    it('getCircuitBreakerStats returns null if circuit breaker doesn\'t exist', () => {
      expect(arm.getCircuitBreakerStats('non-existent')).toBeNull();
    });

    it('resetCircuitBreaker does not fail if circuit breaker doesn\'t exist', () => {
      expect(() => {
        arm.resetCircuitBreaker('non-existent');
      }).not.toThrow();
    });
  });

  describe('errorRecovery convenience methods', () => {
    it('withRetry works', async () => {
      let attempts = 0;
      const result = await errorRecovery.withRetry(async () => {
        attempts++;
        if (attempts === 1) throw new Error('timeout');
        return 'ok';
      }, { maxRetries: 1, baseDelay: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toBe('ok');
    });

    it('withFallback works', async () => {
      const result = await errorRecovery.withFallback(
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('fallback')
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback');
    });

    it('withCircuitBreaker works', async () => {
      const result = await errorRecovery.withCircuitBreaker(() => Promise.resolve('cb-ok'));
      expect(result).toBe('cb-ok');
    });

    it('withTimeout resolves if fast enough', async () => {
      const result = await errorRecovery.withTimeout(() => Promise.resolve('fast'), 100);
      expect(result.success).toBe(true);
      expect(result.result).toBe('fast');
    });

    it('withTimeout rejects if too slow', async () => {
      const result = await errorRecovery.withTimeout(
        () => new Promise(resolve => setTimeout(() => resolve('slow'), 50)),
        10
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TimeoutError);
    });
  });

  describe('global functions', () => {
    it('executeWithRecovery delegates correctly', async () => {
      const result = await executeWithRecovery('global-test', () => Promise.resolve('global-ok'));
      expect(result.success).toBe(true);
      expect(result.result).toBe('global-ok');
    });

    it('registerFallback delegates correctly', () => {
      // Create the circuit breaker entry so it shows up in getAllStats
      globalRecoveryManager.getCircuitBreaker('global-test2');
      registerFallback('global-test2', () => Promise.resolve('ok'));
      const stats = globalRecoveryManager.getAllStats();
      expect(stats['global-test2'].fallbacks).toBe(1);
    });
  });
});
