/**
 * Cache Provider
 * Global client-side cache with TTL, LRU-style eviction, and debug panel
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

interface CacheContextValue<T = unknown> {
  get: <V = T>(key: string) => V | null;
  set: <V = T>(key: string, value: V, ttlMs?: number) => void;
  remove: (key: string) => boolean;
  clear: () => void;
  has: (key: string) => boolean;
  stats: CacheStats;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const CacheContext = createContext<CacheContextValue | null>(null);

interface CacheProviderProps {
  children: React.ReactNode;
  maxSize?: number;
  defaultTtlMs?: number;
  showDebugPanel?: boolean;
}

export function CacheProvider({
  children,
  maxSize = 100,
  defaultTtlMs = 5 * 60 * 1000, // 5 minutes default
  showDebugPanel = false,
}: CacheProviderProps) {
  const cacheRef = useRef<Map<string, CacheEntry<unknown>>>(new Map());
  const [stats, setStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    size: 0,
    maxSize,
  });
  const [isEnabled, setIsEnabled] = useState(true);

  // Update stats when cache size changes
  const updateSizeStat = useCallback(() => {
    setStats((prev) => ({ ...prev, size: cacheRef.current.size }));
  }, []);

  // LRU-style eviction: remove least recently accessed entries if over max size
  const evictIfNeeded = useCallback(() => {
    if (cacheRef.current.size >= maxSize) {
      // Find and remove the least recently accessed entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      cacheRef.current.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      });

      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
        updateSizeStat();
      }
    }
  }, [maxSize, updateSizeStat]);

  // Clean up expired entries
  const cleanExpired = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    cacheRef.current.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => cacheRef.current.delete(key));
    updateSizeStat();
  }, [updateSizeStat]);

  // Get value from cache
  const get = useCallback(
    <V,>(key: string): V | null => {
      if (!isEnabled) return null;

      const entry = cacheRef.current.get(key) as CacheEntry<V> | undefined;

      if (!entry) {
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
        return null;
      }

      // Check if expired
      if (entry.expiresAt < Date.now()) {
        cacheRef.current.delete(key);
        updateSizeStat();
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
        return null;
      }

      // Update last accessed time for LRU
      entry.lastAccessed = Date.now();
      setStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
      return entry.value;
    },
    [isEnabled, updateSizeStat]
  );

  // Set value in cache
  const set = useCallback(
    <V,>(key: string, value: V, ttlMs?: number) => {
      if (!isEnabled) return;

      evictIfNeeded();

      const now = Date.now();
      const entry: CacheEntry<V> = {
        value,
        expiresAt: now + (ttlMs ?? defaultTtlMs),
        lastAccessed: now,
      };

      cacheRef.current.set(key, entry);
      updateSizeStat();
    },
    [isEnabled, defaultTtlMs, evictIfNeeded, updateSizeStat]
  );

  // Remove value from cache
  const remove = useCallback(
    (key: string): boolean => {
      const deleted = cacheRef.current.delete(key);
      if (deleted) {
        updateSizeStat();
      }
      return deleted;
    },
    [updateSizeStat]
  );

  // Clear all cache
  const clear = useCallback(() => {
    cacheRef.current.clear();
    updateSizeStat();
  }, [updateSizeStat]);

  // Check if key exists (and not expired)
  const has = useCallback(
    (key: string): boolean => {
      if (!isEnabled) return false;

      const entry = cacheRef.current.get(key);
      if (!entry) return false;

      if (entry.expiresAt < Date.now()) {
        cacheRef.current.delete(key);
        updateSizeStat();
        return false;
      }

      return true;
    },
    [isEnabled, updateSizeStat]
  );

  // Periodic cleanup of expired entries
  useEffect(() => {
    const interval = setInterval(cleanExpired, 30 * 1000); // Clean every 30 seconds
    return () => clearInterval(interval);
  }, [cleanExpired]);

  const value: CacheContextValue = {
    get,
    set,
    remove,
    clear,
    has,
    stats,
    isEnabled,
    setEnabled: setIsEnabled,
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
      {showDebugPanel && <CacheDebugPanel />}
    </CacheContext.Provider>
  );
}

// Debug panel component (only renders when showDebugPanel=true)
function CacheDebugPanel() {
  const cache = useCache();

  if (!cache) return null;

  const { stats, isEnabled, setEnabled, clear } = cache;
  const hitRate = stats.hits + stats.misses > 0
    ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed bottom-4 left-4 bg-base-200 border border-base-300 rounded-lg shadow-lg p-3 text-xs font-mono z-50">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-bold">Cache Debug</span>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="toggle toggle-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Hits:</span>
        <span className="text-success">{stats.hits}</span>
        <span>Misses:</span>
        <span className="text-error">{stats.misses}</span>
        <span>Hit Rate:</span>
        <span>{hitRate}%</span>
        <span>Size:</span>
        <span>{stats.size}/{stats.maxSize}</span>
      </div>
      <button
        onClick={clear}
        className="btn btn-xs btn-ghost mt-2 w-full"
      >
        Clear
      </button>
    </div>
  );
}

// Hook to access cache context
export function useCache(): CacheContextValue | null {
  return useContext(CacheContext);
}

// Type alias for convenience
export type { CacheContextValue, CacheStats };
