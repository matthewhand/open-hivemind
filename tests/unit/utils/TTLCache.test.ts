import { TTLCache } from '../../../src/utils/TTLCache';

describe('TTLCache', () => {
  let cache: TTLCache<string, number>;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new TTLCache<string, number>(1000, 'test-cache');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 42);
      expect(cache.get('key1')).toBe(42);
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 100);
      jest.advanceTimersByTime(500);
      expect(cache.get('key1')).toBe(100);
    });

    it('should use custom TTL when specified', () => {
      cache.set('key1', 100, 500);
      jest.advanceTimersByTime(600);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should expire after TTL', () => {
      cache.set('key1', 100);
      jest.advanceTimersByTime(1100);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should delete expired entries from cache', () => {
      cache.set('key1', 100);
      expect(cache.getStats().size).toBe(1);
      jest.advanceTimersByTime(1100);
      cache.get('key1'); // Trigger expiration check
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific key', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.invalidate('key1');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe(200);
    });

    it('should do nothing for non-existent key', () => {
      expect(() => cache.invalidate('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 100);
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should count expired gets as misses', () => {
      cache.set('key1', 100, 500);
      jest.advanceTimersByTime(600);
      cache.get('key1'); // expired miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });

    it('should report correct size', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      expect(cache.getStats().size).toBe(2);
      cache.invalidate('key1');
      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('generic types', () => {
    it('should work with object values', () => {
      const objCache = new TTLCache<string, { name: string }>(1000);
      objCache.set('user1', { name: 'Alice' });
      expect(objCache.get('user1')).toEqual({ name: 'Alice' });
    });

    it('should work with number keys', () => {
      const numKeyCache = new TTLCache<number, string>(1000);
      numKeyCache.set(123, 'value');
      expect(numKeyCache.get(123)).toBe('value');
    });
  });
});
