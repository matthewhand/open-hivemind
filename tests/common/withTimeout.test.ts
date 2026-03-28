import { withTimeout } from '@common/withTimeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return the result when the operation completes before timeout', async () => {
    const operation = jest.fn(async (_signal: AbortSignal) => 'success');

    const promise = withTimeout(operation, 5000, 'testOp');
    jest.advanceTimersByTime(0);
    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    // Verify the signal was passed
    expect(operation.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('should throw a timeout error when the operation exceeds the timeout', async () => {
    const operation = jest.fn(async (signal: AbortSignal) => {
      return new Promise<string>((resolve, reject) => {
        const check = setInterval(() => {
          if (signal.aborted) {
            clearInterval(check);
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          }
        }, 100);
      });
    });

    const promise = withTimeout(operation, 3000, 'slowOp');
    jest.advanceTimersByTime(3000);

    await expect(promise).rejects.toThrow('slowOp timed out after 3000ms');
  });

  it('should propagate errors from the operation', async () => {
    const operation = jest.fn(async (_signal: AbortSignal) => {
      throw new Error('upstream failure');
    });

    const promise = withTimeout(operation, 5000, 'failOp');
    jest.advanceTimersByTime(0);

    await expect(promise).rejects.toThrow('upstream failure');
  });

  it('should always clear the timeout timer (cleanup)', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Successful case
    const successOp = async (_signal: AbortSignal) => 42;
    const p1 = withTimeout(successOp, 5000, 'cleanupSuccess');
    jest.advanceTimersByTime(0);
    await p1;
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockClear();

    // Error case
    const failOp = async (_signal: AbortSignal) => {
      throw new Error('boom');
    };
    const p2 = withTimeout(failOp, 5000, 'cleanupFail');
    jest.advanceTimersByTime(0);
    await p2.catch(() => {});
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
