/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiService } from './api';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * API request caching and deduplication layer.
 *
 * - Deduplicates concurrent identical GET requests (only one fetch fires).
 * - Caches GET responses with a configurable TTL (default 30 seconds).
 * - Auto-invalidates cache entries when a POST/PUT/DELETE/PATCH to the same
 *   resource path fires.
 * - Exposes `invalidate(pattern)` for manual cache busting.
 */
class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<any>>();
  private defaultTtl: number;

  constructor(defaultTtl = 30_000) {
    this.defaultTtl = defaultTtl;
  }

  // ── GET with caching + deduplication ────────────────────────────────

  async get<T>(endpoint: string, options?: { ttl?: number; bust?: boolean }): Promise<T> {
    const ttl = options?.ttl ?? this.defaultTtl;

    // Return cached value if still valid and not explicitly busted
    if (!options?.bust) {
      const cached = this.cache.get(endpoint);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data as T;
      }
    }

    // Deduplicate: if an identical request is already in-flight, piggy-back
    const existing = this.inflight.get(endpoint);
    if (existing) return existing as Promise<T>;

    const promise = apiService.get<T>(endpoint).then((data) => {
      this.cache.set(endpoint, { data, timestamp: Date.now(), ttl });
      return data;
    }).finally(() => {
      this.inflight.delete(endpoint);
    });

    this.inflight.set(endpoint, promise);
    return promise;
  }

  // ── Mutating methods — auto-invalidate related cache entries ────────

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const result = await apiService.post<T>(endpoint, body);
    this.invalidateByPath(endpoint);
    return result;
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const result = await apiService.put<T>(endpoint, body);
    this.invalidateByPath(endpoint);
    return result;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await apiService.delete<T>(endpoint);
    this.invalidateByPath(endpoint);
    return result;
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    const result = await apiService.patch<T>(endpoint, body);
    this.invalidateByPath(endpoint);
    return result;
  }

  // ── Cache management ───────────────────────────────────────────────

  /**
   * Invalidate cache entries whose key matches the given string or RegExp.
   *
   * Examples:
   *   invalidate('/api/bots')        — exact match
   *   invalidate(/^\/api\/bots/)     — any key starting with /api/bots
   */
  invalidate(pattern: string | RegExp): void {
    for (const key of this.cache.keys()) {
      const matches =
        typeof pattern === 'string' ? key === pattern : pattern.test(key);
      if (matches) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
  }

  /** Return the number of cached entries (useful for debugging). */
  get size(): number {
    return this.cache.size;
  }

  // ── Internals ──────────────────────────────────────────────────────

  /**
   * After a mutation on `/api/foo/123`, invalidate all cache entries whose
   * key shares the same resource root (`/api/foo`).
   */
  private invalidateByPath(endpoint: string): void {
    // Extract the resource root: first two path segments after the leading slash
    // e.g. "/api/bots/abc/start" -> "/api/bots"
    const parts = endpoint.split('/').filter(Boolean); // ['api','bots','abc','start']
    const root = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : endpoint;

    for (const key of this.cache.keys()) {
      if (key.startsWith(root)) {
        this.cache.delete(key);
      }
    }
  }
}

/** Singleton instance used by the application. */
export const apiCache = new ApiCache();
export default apiCache;
