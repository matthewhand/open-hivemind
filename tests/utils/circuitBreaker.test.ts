import { CircuitBreaker } from '@src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  test('allows execution when closed and resets on success', () => {
    const cb = new CircuitBreaker(2, 50);
    expect(cb.canExecute()).toBe(true);
    cb.onSuccess();
    expect(cb.getState()).toBe('closed');
  });

  test('trips after threshold failures and recovers after timeout', async () => {
    const cb = new CircuitBreaker(2, 20);
    expect(cb.canExecute()).toBe(true);
    cb.onFailure();
    expect(cb.getState()).toBe('closed');

    cb.onFailure();
    // breaker should be open now
    expect(cb.getState()).toBe('open');
    expect(cb.canExecute()).toBe(false);
    await new Promise((r) => setTimeout(r, 25));
    expect(cb.canExecute()).toBe(true); // half-open
    cb.onSuccess();
    expect(cb.getState()).toBe('closed');
  });

  test('fails while half-open trips again', async () => {
    const cb = new CircuitBreaker(1, 10);
    cb.onFailure();
    expect(cb.getState()).toBe('open');
    await new Promise((r) => setTimeout(r, 12));
    expect(cb.canExecute()).toBe(true); // half-open
    cb.onFailure();
    expect(cb.getState()).toBe('open');
  });
});
