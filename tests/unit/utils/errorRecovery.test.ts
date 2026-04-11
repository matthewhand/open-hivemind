import {
  CircuitBreaker,
  RetryHandler,
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
