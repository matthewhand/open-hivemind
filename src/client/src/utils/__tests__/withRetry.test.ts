import { withRetry } from '../withRetry';

describe('withRetry', () => {
  it('should return result on first attempt if successful (happy path)', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed after initial failures (edge case)', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('network error 1'))
      .mockRejectedValueOnce(new Error('network error 2'))
      .mockResolvedValue('eventual success');

    // Use a tiny delay to speed up the test
    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('eventual success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries are exhausted (error case)', async () => {
    const error = new Error('network failure');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 2, 10)).rejects.toThrow('network failure');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
