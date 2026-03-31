import { TTLCache } from '../utils/TTLCache';

export class BotConfigCache {
  private cache: TTLCache<string, Record<string, unknown>>;

  constructor(ttlMs: number = 30000) {
    this.cache = new TTLCache<string, Record<string, unknown>>(ttlMs, 'BotConfigCache');
  }

  public get(key: string): Record<string, unknown> | undefined {
    return this.cache.get(key);
  }

  public set(key: string, value: Record<string, unknown>): void {
    this.cache.set(key, value);
  }

  public invalidate(key: string): void {
    this.cache.invalidate(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
