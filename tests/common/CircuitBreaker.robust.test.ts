import { 
  CircuitBreaker, 
  CircuitBreakerState, 
  CircuitBreakerError 
} from '../../src/common/CircuitBreaker';

describe('CircuitBreaker (Robust)', () => {
  let breaker: CircuitBreaker;
  const RESET_TIMEOUT = 1000;
  const FAILURE_THRESHOLD = 3;

  beforeEach(() => {
    jest.useFakeTimers();
    // Set a fixed system time for consistent testing
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    
    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: FAILURE_THRESHOLD,
      resetTimeoutMs: RESET_TIMEOUT,
      halfOpenMaxAttempts: 2
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CLOSED State', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should pass through successful calls', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.getStats().totalSuccesses).toBe(1);
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const error = new Error('service down');
      
      // 1st failure
      await expect(breaker.execute(async () => { throw error; })).rejects.toThrow(error);
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      
      // 2nd failure
      await expect(breaker.execute(async () => { throw error; })).rejects.toThrow(error);
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      
      // 3rd failure (threshold reached)
      await expect(breaker.execute(async () => { throw error; })).rejects.toThrow(error);
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('OPEN State', () => {
    beforeEach(async () => {
      // Trip the breaker
      for (let i = 0; i < FAILURE_THRESHOLD; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject requests immediately with CircuitBreakerError', async () => {
      await expect(breaker.execute(async () => 'should not run')).rejects.toThrow(CircuitBreakerError);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Advance time but not enough
      jest.advanceTimersByTime(RESET_TIMEOUT - 100);
      await expect(breaker.execute(async () => 'still open')).rejects.toThrow(CircuitBreakerError);
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Advance past timeout
      jest.advanceTimersByTime(200);
      
      // Next call should transition to HALF_OPEN and allow request
      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('HALF_OPEN State', () => {
    beforeEach(async () => {
      // Trip and wait for reset
      for (let i = 0; i < FAILURE_THRESHOLD; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      jest.advanceTimersByTime(RESET_TIMEOUT + 1);
      // First call transitions to HALF_OPEN
      await breaker.execute(async () => 'probe-1');
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('should transition back to CLOSED after successful probes', async () => {
      // We set halfOpenMaxAttempts to 2. First probe was in beforeEach.
      // Second successful probe:
      await breaker.execute(async () => 'probe-2');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.getStats().consecutiveFailures).toBe(0);
    });

    it('should transition back to OPEN if a probe fails', async () => {
      const error = new Error('probe failed');
      await expect(breaker.execute(async () => { throw error; })).rejects.toThrow(error);
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('should cap the number of parallel probes in HALF_OPEN', async () => {
      // Current attempts = 1 (from beforeEach). 
      // Next call will be attempt 2.
      // Call after that should be rejected if not finished.
      // (This tests the synchronous check before 'await fn()')
      
      const slowProbe = breaker.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'slow-success';
      });
      
      // attempt 3 should be rejected immediately because maxAttempts is 2
      await expect(breaker.execute(async () => 'fast-fail')).rejects.toThrow(CircuitBreakerError);
      
      jest.advanceTimersByTime(500);
      await slowProbe;
    });
  });
});
