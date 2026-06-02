import {
  CircuitBreaker,
  RetryHandler,
  FallbackManager,
  type RetryConfig,
  type CircuitBreakerConfig,
} from '../../../src/utils/errorRecovery';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      monitoringPeriod: 60000,
      expectedRecoveryTime: 30000,
    });
  });

  describe('execute', () => {
    it('should pass through successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw when operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(breaker.execute(operation)).rejects.toThrow('Test error');
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      // Circuit should be open now
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should reset to half_open after timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      jest.useFakeTimers();
      jest.advanceTimersByTime(1100);

      // Should allow one attempt in half_open state
      operation.mockResolvedValue('recovered');
      const result = await breaker.execute(operation);
      expect(result).toBe('recovered');

      jest.useRealTimers();
    });
  });

  describe('getState', () => {
    it('should return closed initially', () => {
      expect(breaker.getState()).toBe('closed');
    });

    it('should return open after failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker to closed state', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
    });
  });
});

describe('FallbackManager', () => {
  let manager: FallbackManager;

  beforeEach(() => {
    manager = new FallbackManager();
  });

  describe('registerFallback and getFallbacks', () => {
    it('should register and retrieve fallbacks', () => {
      const fallback = jest.fn().mockResolvedValue('fallback');
      manager.registerFallback('test-op', fallback);

      const fallbacks = manager.getFallbacks('test-op');
      expect(fallbacks).toHaveLength(1);
      expect(fallbacks[0]).toBe(fallback);
    });

    it('should handle multiple fallbacks for the same key', () => {
      const f1 = jest.fn().mockResolvedValue('f1');
      const f2 = jest.fn().mockResolvedValue('f2');
      manager.registerFallback('test-op', f1);
      manager.registerFallback('test-op', f2);

      const fallbacks = manager.getFallbacks('test-op');
      expect(fallbacks).toHaveLength(2);
      expect(fallbacks[0]).toBe(f1);
      expect(fallbacks[1]).toBe(f2);
    });

    it('should return empty array for unregistered key', () => {
      expect(manager.getFallbacks('non-existent')).toEqual([]);
    });
  });

  describe('executeWithFallback', () => {
    it('should return result from primary operation if it succeeds', async () => {
      const primary = jest.fn().mockResolvedValue('primary-success');
      const fallback = jest.fn().mockResolvedValue('fallback');
      manager.registerFallback('test-op', fallback);

      const result = await manager.executeWithFallback('test-op', primary);

      expect(result.success).toBe(true);
      expect(result.result).toBe('primary-success');
      expect(result.strategy).toBe('primary');
      expect(result.attempts).toBe(1);
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use first fallback if primary fails', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('primary-fail'));
      const fallback = jest.fn().mockResolvedValue('fallback-success');
      manager.registerFallback('test-op', fallback);

      const result = await manager.executeWithFallback('test-op', primary);

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback-success');
      expect(result.strategy).toBe('fallback_1');
      expect(result.attempts).toBe(2);
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should try fallbacks in order until one succeeds', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('primary-fail'));
      const f1 = jest.fn().mockRejectedValue(new Error('f1-fail'));
      const f2 = jest.fn().mockResolvedValue('f2-success');
      const f3 = jest.fn().mockResolvedValue('f3-success');

      manager.registerFallback('test-op', f1);
      manager.registerFallback('test-op', f2);
      manager.registerFallback('test-op', f3);

      const result = await manager.executeWithFallback('test-op', primary);

      expect(result.success).toBe(true);
      expect(result.result).toBe('f2-success');
      expect(result.strategy).toBe('fallback_2');
      expect(result.attempts).toBe(3);
      expect(f1).toHaveBeenCalledTimes(1);
      expect(f2).toHaveBeenCalledTimes(1);
      expect(f3).not.toHaveBeenCalled();
    });

    it('should return failure if primary and all fallbacks fail', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('primary-fail'));
      const f1 = jest.fn().mockRejectedValue(new Error('f1-fail'));
      const f2 = jest.fn().mockRejectedValue(new Error('f2-fail'));

      manager.registerFallback('test-op', f1);
      manager.registerFallback('test-op', f2);

      const result = await manager.executeWithFallback('test-op', primary);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('primary-fail');
      expect(result.strategy).toBe('failed');
      expect(result.attempts).toBe(3); // primary + 2 fallbacks
    });

    it('should handle primary error that is not an Error object', async () => {
      const primary = jest.fn().mockRejectedValue('string-error');
      const result = await manager.executeWithFallback('test-op', primary);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('string-error');
    });
  });

  describe('clearing fallbacks', () => {
    it('should clear fallbacks for a specific key', () => {
      manager.registerFallback('op1', async () => 'f1');
      manager.registerFallback('op2', async () => 'f2');

      manager.clearFallbacks('op1');

      expect(manager.getFallbacks('op1')).toEqual([]);
      expect(manager.getFallbacks('op2')).toHaveLength(1);
    });

    it('should clear all fallbacks', () => {
      manager.registerFallback('op1', async () => 'f1');
      manager.registerFallback('op2', async () => 'f2');

      manager.clearAllFallbacks();

      expect(manager.getFallbacks('op1')).toEqual([]);
      expect(manager.getFallbacks('op2')).toEqual([]);
    });
  });
});

describe('RetryHandler', () => {
  let handler: RetryHandler;
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: false,
    retryableErrors: ['network_error', 'timeout'],
    retryableStatusCodes: [429, 500, 502, 503],
  };

  beforeEach(() => {
    jest.useFakeTimers();
    handler = new RetryHandler(defaultConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute', () => {
    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await handler.execute(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
    });
  });
});
