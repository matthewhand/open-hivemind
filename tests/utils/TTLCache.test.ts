import { TTLCache } from '../../src/utils/TTLCache';

describe('TTLCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve values within TTL', () => {
    const cache = new TTLCache<string, string>(1000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(0);
  });

  it('should return undefined and delete item after TTL expires', () => {
    const cache = new TTLCache<string, string>(1000);
    cache.set('key1', 'value1');

    // Fast-forward time by 1001ms
    jest.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeUndefined();

    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(0); // Item should have been deleted
  });

  it('should support custom TTL per set', () => {
    const cache = new TTLCache<string, string>(5000); // Default 5s
    cache.set('key1', 'value1', 1000); // Custom 1s

    jest.advanceTimersByTime(1001);

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should handle invalidate correctly', () => {
    const cache = new TTLCache<string, string>(1000);
    cache.set('key1', 'value1');
    cache.invalidate('key1');

    expect(cache.get('key1')).toBeUndefined();
  });

  it('should handle clear correctly', () => {
    const cache = new TTLCache<string, string>(1000);
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.getStats().size).toBe(0);
  });

  it('should keep track of concurrent updates correctly', () => {
    const cache = new TTLCache<string, number>(1000);

    cache.set('counter', 1);
    expect(cache.get('counter')).toBe(1);

    cache.set('counter', 2);
    expect(cache.get('counter')).toBe(2);

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.size).toBe(1);
  });
});
