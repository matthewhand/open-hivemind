/**
 * API Cache Service - Provides intelligent caching for frequently accessed endpoints
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  endpointTTLs: Record<string, number>;
}

class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
    maxSize: 100,
    endpointTTLs: {
      // Configuration endpoints - cache longer since they change infrequently
      '/api/config/response-profiles': 10 * 60 * 1000, // 10 minutes
      '/api/config/guardrails': 10 * 60 * 1000,
      '/api/config/llm-profiles': 10 * 60 * 1000,
      '/api/config/mcp-server-profiles': 10 * 60 * 1000,
      '/api/admin/mcp-servers': 5 * 60 * 1000,
      
      // Status endpoints - cache briefly since they change frequently
      '/api/status': 30 * 1000, // 30 seconds
      '/api/config': 2 * 60 * 1000, // 2 minutes
      
      // Model endpoints - cache moderately since they're expensive but relatively stable
      '/api/admin/llm-providers/openai/models': 15 * 60 * 1000, // 15 minutes
      '/api/admin/llm-providers/anthropic/models': 15 * 60 * 1000,
      '/api/admin/llm-providers/custom/models': 5 * 60 * 1000,
    }
  };

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with appropriate TTL
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const ttl = customTTL || this.config.endpointTTLs[key] || this.config.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Check if data exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      entries
    };
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Calculate cache hit rate (simplified - would need request tracking for accuracy)
   */
  private calculateHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track hits vs misses
    return this.cache.size > 0 ? 0.75 : 0; // Placeholder
  }

  /**
   * Invalidate cache entries that might be affected by a configuration change
   */
  invalidateConfigCache(): void {
    this.clearPattern('/api/config/');
    this.clearPattern('/api/admin/');
  }

  /**
   * Invalidate model cache for a specific provider
   */
  invalidateModelCache(provider: string): void {
    this.clearPattern(`/api/admin/llm-providers/${provider}/models`);
  }
}

// Export singleton instance
export const apiCache = new ApiCacheService();

/**
 * Enhanced API service wrapper with caching
 */
export class CachedApiService {
  constructor(private baseApiService: any) {}

  /**
   * GET request with caching
   */
  async get<T>(endpoint: string, options?: { skipCache?: boolean; cacheTTL?: number }): Promise<T> {
    const cacheKey = endpoint;
    
    // Check cache first unless explicitly skipped
    if (!options?.skipCache) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch from API
    const data = await this.baseApiService.get<T>(endpoint);
    
    // Cache the result
    apiCache.set(cacheKey, data, options?.cacheTTL);
    
    return data;
  }

  /**
   * POST/PUT/DELETE requests that invalidate related cache
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const result = await this.baseApiService.post<T>(endpoint, data);
    this.invalidateRelatedCache(endpoint);
    return result;
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const result = await this.baseApiService.put<T>(endpoint, data);
    this.invalidateRelatedCache(endpoint);
    return result;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const result = await this.baseApiService.delete<T>(endpoint);
    this.invalidateRelatedCache(endpoint);
    return result;
  }

  /**
   * Invalidate cache entries related to the modified endpoint
   */
  private invalidateRelatedCache(endpoint: string): void {
    if (endpoint.includes('/config/')) {
      apiCache.invalidateConfigCache();
    }
    if (endpoint.includes('/llm-providers/')) {
      const providerMatch = endpoint.match(/\/llm-providers\/([^\/]+)/);
      if (providerMatch) {
        apiCache.invalidateModelCache(providerMatch[1]);
      }
    }
  }

  // Delegate other methods to base service
  getConfig = () => this.baseApiService.getConfig();
  getStatus = () => this.baseApiService.getStatus();
  getGlobalConfig = () => this.baseApiService.getGlobalConfig();
  getActivity = (params?: any) => this.baseApiService.getActivity(params);
  getServiceHealth = () => this.baseApiService.getServiceHealth();
}

export default apiCache;