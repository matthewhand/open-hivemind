import { retry, defaultShouldRetry } from '@src/utils/retry';

describe('retry utility', () => {
  test('retries on retryable error and succeeds', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts += 1;
      if (attempts < 2) {
        const err: any = new Error('server error');
        err.status = 500;
        throw err;
      }
      return 'ok';
    });

    const result = await retry(fn, { retries: 3, minDelayMs: 1, maxDelayMs: 2, jitter: 'none' });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('does not retry on fatal error (400)', async () => {
    const fn = jest.fn(async () => {
      const err: any = new Error('bad request');
      err.status = 400;
      throw err;
    });

    await expect(retry(fn, { retries: 3, minDelayMs: 1, maxDelayMs: 2, jitter: 'none' })).rejects.toThrow('bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('defaultShouldRetry recognizes retry-after header', () => {
    const err: any = { response: { headers: { 'retry-after': '10' } } };
    expect(defaultShouldRetry(err, 0)).toBe(true);
  });
});
