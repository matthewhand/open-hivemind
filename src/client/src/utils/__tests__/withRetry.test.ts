import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../withRetry';

describe('withRetry', () => {
  it('should return result on first attempt if successful (happy path)', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed after initial failures (edge case)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('network fail 1'))
      .mockRejectedValueOnce(new Error('timeout fail 2'))
      .mockResolvedValue('eventual success');

    const result = await withRetry(fn, 3, 10);
    expect(result).toBe('eventual success');
    expect(fn).toHaveBeenCalledTimes(3); // 2 failures + 1 success
  });

  it('should fail after max retries are exhausted (error case)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network permanent failure'));

    await expect(withRetry(fn, 2, 10)).rejects.toThrow('network permanent failure');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
