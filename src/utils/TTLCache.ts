import Debug from 'debug';

const debug = Debug('app:TTLCache');

export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;
  private name: string;

  constructor(defaultTTL = 30000, name = 'TTLCache') {
    this.defaultTTL = defaultTTL;
    this.name = name;
  }

  set(key: K, value: V, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    debug(`[${this.name}] Set key: ${String(key)}, ttl: ${ttl}ms`);
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      debug(`[${this.name}] Miss key: ${String(key)} (total hits: ${this.hits}, misses: ${this.misses})`);
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.misses++;
      debug(`[${this.name}] Miss (expired) key: ${String(key)} (total hits: ${this.hits}, misses: ${this.misses})`);
      return undefined;
    }

    this.hits++;
    debug(`[${this.name}] Hit key: ${String(key)} (total hits: ${this.hits}, misses: ${this.misses})`);
    return item.value;
  }

  invalidate(key: K): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      debug(`[${this.name}] Invalidated key: ${String(key)}`);
    }
  }

  clear(): void {
    this.cache.clear();
    debug(`[${this.name}] Cleared all keys`);
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }
}
