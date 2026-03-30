import { ReconnectionManager } from '../../src/providers/ReconnectionManager';

describe('ReconnectionManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should attempt connection on start', async () => {
    const connectFn = jest.fn().mockResolvedValue(undefined);
    const manager = new ReconnectionManager('test', connectFn);

    await manager.start();

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(manager.getStatus().state).toBe('connected');
  });

  it('should retry on failure', async () => {
    const connectFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce(undefined);

    const manager = new ReconnectionManager('test', connectFn, {
      initialDelayMs: 1000,
      jitter: false,
    });

    await manager.start();

    expect(connectFn).toHaveBeenCalledTimes(1);
    expect(manager.getStatus().state).toBe('reconnecting');
    expect(manager.getStatus().attempts).toBe(1);

    // Fast-forward time to trigger next attempt
    jest.advanceTimersByTime(1000);

    // Wait for async operations to complete
    await Promise.resolve();
    await Promise.resolve();

    expect(connectFn).toHaveBeenCalledTimes(2);
    expect(manager.getStatus().state).toBe('connected');
    expect(manager.getStatus().attempts).toBe(0); // Resets on success
  });

  it('should give up after max retries', async () => {
    const connectFn = jest.fn().mockRejectedValue(new Error('fail'));

    const manager = new ReconnectionManager('test', connectFn, {
      initialDelayMs: 1000,
      maxRetries: 3,
      jitter: false,
    });

    await manager.start();

    // Attempt 1 fails
    expect(connectFn).toHaveBeenCalledTimes(1);

    // Fast-forward for Attempt 2
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(connectFn).toHaveBeenCalledTimes(2);

    // Fast-forward for Attempt 3 (max retries reached here)
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();
    expect(connectFn).toHaveBeenCalledTimes(3);

    expect(manager.getStatus().state).toBe('failed');
  });

  it('should auto-reconnect when onDisconnected is called', async () => {
    const connectFn = jest.fn().mockResolvedValue(undefined);
    const manager = new ReconnectionManager('test', connectFn);

    await manager.start();
    expect(manager.getStatus().state).toBe('connected');

    manager.onDisconnected(new Error('Connection lost'));

    // Next start happens asynchronously
    await Promise.resolve();

    expect(manager.getStatus().state).toBe('connected');
    expect(connectFn).toHaveBeenCalledTimes(2);
  });

  it('should stop reconnection timer on stop()', async () => {
    const connectFn = jest.fn().mockRejectedValue(new Error('fail'));
    const manager = new ReconnectionManager('test', connectFn, {
      initialDelayMs: 1000,
      jitter: false,
    });

    await manager.start();
    expect(manager.getStatus().state).toBe('reconnecting');
    expect(connectFn).toHaveBeenCalledTimes(1);

    manager.stop();
    expect(manager.getStatus().state).toBe('disconnected');

    jest.advanceTimersByTime(2000);
    expect(connectFn).toHaveBeenCalledTimes(1); // should not be called again
  });

  it('should not reconnect on onDisconnected if already reconnecting', () => {
    // Return a promise that never resolves so it stays in "reconnecting" state forever
    // We don't need async/await for this test if we handle it properly
    const connectFn = jest.fn().mockReturnValue(new Promise(() => {}));
    const manager = new ReconnectionManager('test', connectFn, {
      initialDelayMs: 1000,
      jitter: false,
    });

    // We don't await start because it will block forever on connectFn
    manager.start();

    expect(manager.getStatus().state).toBe('reconnecting');
    expect(connectFn).toHaveBeenCalledTimes(1);

    manager.onDisconnected(); // Should early return because state is reconnecting

    expect(connectFn).toHaveBeenCalledTimes(1);

    // Stop the manager to clear timers and prevent Jest from hanging
    manager.stop();
  });
});
