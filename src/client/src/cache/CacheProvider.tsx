import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, Badge, Button, LoadingSpinner, Toggle } from '../components/DaisyUI';
import {
  CircleStackIcon,
  TrashIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T, ttl?: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  stats: CacheStats;
  isEnabled: boolean;
  toggleCache: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<Map<string, CacheItem<any>>>(new Map());
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, size: 0, maxSize: 100 });
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Mock initial data
  useEffect(() => {
    const initialCache = new Map();
    initialCache.set('user_prefs', { value: { theme: 'dark' }, expiry: Date.now() + 3600000 });
    initialCache.set('recent_bots', { value: ['bot-1', 'bot-2'], expiry: Date.now() + 1800000 });
    setCache(initialCache);
    setStats(prev => ({ ...prev, size: initialCache.size }));
  }, []);

  function get<T>(key: string): T | null {
    if (!isEnabled) return null;

    const item = cache.get(key);
    if (!item) {
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    if (Date.now() > item.expiry) {
      cache.delete(key);
      setStats(prev => ({ ...prev, misses: prev.misses + 1, size: cache.size }));
      return null;
    }

    setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return item.value;
  }

  function set<T>(key: string, value: T, ttl: number = 3600000) {
    if (!isEnabled) return;

    if (cache.size >= stats.maxSize) {
      // Simple LRU approximation: delete first key
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, { value, expiry: Date.now() + ttl });
    setStats(prev => ({ ...prev, size: cache.size }));
    // Force re-render for stats update
    setCache(new Map(cache));
  }

  const remove = (key: string) => {
    cache.delete(key);
    setStats(prev => ({ ...prev, size: cache.size }));
    setCache(new Map(cache));
  };

  const clear = () => {
    setLoading(true);
    setTimeout(() => {
      cache.clear();
      setStats(prev => ({ ...prev, hits: 0, misses: 0, size: 0 }));
      setCache(new Map());
      setLoading(false);
    }, 500);
  };

  const toggleCache = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <CacheContext.Provider value={{ get, set, remove, clear, stats, isEnabled, toggleCache }}>
      {children}

      {/* Cache Debug Panel (Hidden in production usually, visible here for demo) */}
      <div className="fixed bottom-4 left-4 z-50">
        <Card className="w-72 shadow-xl bg-base-100 border border-base-300 opacity-90 hover:opacity-100 transition-opacity">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CircleStackIcon className="w-5 h-5 text-secondary" />
                <h3 className="font-bold text-sm">Cache System</h3>
              </div>
              <Toggle
                checked={isEnabled}
                onChange={toggleCache}
                size="sm"
                color="secondary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-base-200 p-2 rounded flex flex-col items-center">
                <span className="font-bold text-success">{stats.hits}</span>
                <span className="opacity-70">Hits</span>
              </div>
              <div className="bg-base-200 p-2 rounded flex flex-col items-center">
                <span className="font-bold text-error">{stats.misses}</span>
                <span className="opacity-70">Misses</span>
              </div>
              <div className="bg-base-200 p-2 rounded flex flex-col items-center">
                <span className="font-bold">{stats.size}</span>
                <span className="opacity-70">Items</span>
              </div>
              <div className="bg-base-200 p-2 rounded flex flex-col items-center">
                <span className="font-bold">{stats.maxSize}</span>
                <span className="opacity-70">Max</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="w-full text-error btn-outline border-error hover:bg-error hover:text-white"
              onClick={clear}
              disabled={loading || stats.size === 0}
            >
              {loading ? <LoadingSpinner size="xs" /> : (
                <>
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Clear Cache
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) throw new Error('useCache must be used within CacheProvider');
  return context;
};

export default CacheProvider;