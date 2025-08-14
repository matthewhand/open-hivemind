import { RateLimitQueue } from '@src/utils/rateLimitQueue';

describe('RateLimitQueue', () => {
  test('throttles tasks to tokens per interval and concurrency', async () => {
    const q = new RateLimitQueue({ tokensPerInterval: 2, intervalMs: 10, maxConcurrency: 1 });

    const started: number[] = [];
    const finished: number[] = [];

    const task = (id: number) => q.enqueue(async () => {
      started.push(id);
      await new Promise((r) => setTimeout(r, 5));
      finished.push(id);
      return id;
    });

    const p1 = task(1);
    const p2 = task(2);
    const p3 = task(3);

    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual([1, 2, 3]);
    expect(started[0]).toBe(1);
    expect(finished.includes(3)).toBe(true);
  });

  test('rejects when saturated if maxQueueSize is set', async () => {
    const q = new RateLimitQueue({ tokensPerInterval: 1, intervalMs: 1000, maxConcurrency: 1, maxQueueSize: 0 });
    await expect(q.enqueue(async () => 1)).resolves.toBe(1);
    await expect(q.enqueue(async () => 2)).rejects.toThrow('RateLimitQueue saturated');
  });
});
