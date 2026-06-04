import { LoginAttemptTracker } from '../../../src/auth/LoginAttemptTracker';

describe('LoginAttemptTracker', () => {
  it('builds a normalized, IP-scoped key', () => {
    expect(LoginAttemptTracker.buildKey('Alice')).toBe('alice');
    expect(LoginAttemptTracker.buildKey('Alice', '1.2.3.4')).toBe('alice|1.2.3.4');
    expect(LoginAttemptTracker.buildKey('')).toBe('');
  });

  it('locks once the threshold is reached and reports remaining time', () => {
    const t = new LoginAttemptTracker({ maxAttempts: 3, lockoutDurationMs: 1000 });
    const key = 'k';
    expect(t.getLockRemainingMs(key)).toBe(0);
    t.recordFailure(key);
    t.recordFailure(key);
    expect(t.getLockRemainingMs(key)).toBe(0); // 2 < 3
    t.recordFailure(key);
    expect(t.getLockRemainingMs(key)).toBeGreaterThan(0);
  });

  it('clear() removes all state for the key', () => {
    const t = new LoginAttemptTracker({ maxAttempts: 1, lockoutDurationMs: 1000 });
    t.recordFailure('k');
    expect(t.getLockRemainingMs('k')).toBeGreaterThan(0);
    t.clear('k');
    expect(t.getLockRemainingMs('k')).toBe(0);
  });

  it('is disabled when maxAttempts <= 0', () => {
    const t = new LoginAttemptTracker({ maxAttempts: 0 });
    expect(t.enabled).toBe(false);
    for (let i = 0; i < 50; i++) t.recordFailure('k');
    expect(t.getLockRemainingMs('k')).toBe(0);
  });

  it('lazily expires the lock once the duration elapses', () => {
    jest.useFakeTimers();
    try {
      const t = new LoginAttemptTracker({ maxAttempts: 1, lockoutDurationMs: 500 });
      t.recordFailure('k');
      expect(t.getLockRemainingMs('k')).toBeGreaterThan(0);
      jest.advanceTimersByTime(501);
      expect(t.getLockRemainingMs('k')).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('resets a stale (non-locking) counter after the attempt window', () => {
    jest.useFakeTimers();
    try {
      const t = new LoginAttemptTracker({
        maxAttempts: 3,
        lockoutDurationMs: 10_000,
        attemptWindowMs: 1000,
      });
      t.recordFailure('k');
      t.recordFailure('k'); // 2 failures, not locked
      jest.advanceTimersByTime(1500); // window elapses
      // Next failure starts a fresh count of 1, so still not locked.
      t.recordFailure('k');
      expect(t.getLockRemainingMs('k')).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
