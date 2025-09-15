import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { 
  Storage as StorageIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as TimeIcon,
  DataUsage as DataUsageIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

export interface CacheConfig {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    ttl: number; // seconds
    maxRetries: number;
    retryDelay: number; // milliseconds
  };
  memory: {
    enabled: boolean;
    maxSize: number; // MB
    ttl: number; // seconds
    cleanupInterval: number; // seconds
    compression: boolean;
  };
  api: {
    enabled: boolean;
    defaultTTL: number; // seconds
    staleWhileRevalidate: boolean;
    backgroundRefresh: boolean;
    cacheControl: string;
  };
  strategies: {
    botData: CacheStrategy;
    userData: CacheStrategy;
    analytics: CacheStrategy;
    config: CacheStrategy;
    dashboard: CacheStrategy;
  };
}

export interface CacheStrategy {
  type: 'redis' | 'memory' | 'hybrid';
  ttl: number;
  compression: boolean;
  invalidationKeys: string[];
  warmUp: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  redisUsage: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  compressionRatio: number;
  keysCount: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  compressed?: boolean;
  size: number;
  tags: string[];
}

export interface CacheStats {
  memory: {
    used: number;
    available: number;
    peak: number;
    entries: number;
  };
  redis: {
    connected: boolean;
    usedMemory: number;
    peakMemory: number;
    keys: number;
    commands: number;
  };
  performance: {
    hitRate: number;
    avgResponseTime: number;
    slowQueries: number;
    errors: number;
  };
  strategies: Record<string, StrategyStats>;
}

export interface StrategyStats {
  hits: number;
  misses: number;
  evictions: number;
  avgTtl: number;
  compressionRatio: number;
}

interface CacheContextType {
  // Configuration
  config: CacheConfig;
  isConnected: boolean;
  isLoading: boolean;
  
  // Metrics and stats
  metrics: CacheMetrics;
  stats: CacheStats;
  entries: CacheEntry[];
  
  // Core operations
  get: <T>(key: string, strategy?: keyof CacheConfig['strategies']) => Promise<T | null>;
  set: <T>(key: string, value: T, options?: CacheSetOptions) => Promise<void>;
  del: (key: string) => Promise<void>;
  clear: (pattern?: string) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  
  // Advanced operations
  getMany: <T>(keys: string[]) => Promise<(T | null)[]>;
  setMany: <T>(entries: Array<{ key: string; value: T; options?: CacheSetOptions }>) => Promise<void>;
  invalidateByTags: (tags: string[]) => Promise<void>;
  invalidateByPattern: (pattern: string) => Promise<void>;
  
  // Strategy operations
  warmUp: (strategy: keyof CacheConfig['strategies']) => Promise<void>;
  optimize: (strategy?: keyof CacheConfig['strategies']) => Promise<void>;
  
  // Management
  updateConfig: (updates: Partial<CacheConfig>) => Promise<void>;
  resetStats: () => void;
  clearAll: () => Promise<void>;
  
  // Monitoring
  subscribe: (callback: (event: CacheEvent) => void) => () => void;
  getSlowQueries: () => SlowQuery[];
  getErrors: () => CacheError[];
  
  // UI helpers
  formatBytes: (bytes: number) => string;
  formatDuration: (ms: number) => string;
  getHealthStatus: () => 'healthy' | 'warning' | 'critical';
}

export interface CacheSetOptions {
  ttl?: number;
  tags?: string[];
  compression?: boolean;
  strategy?: keyof CacheConfig['strategies'];
}

export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'del' | 'clear' | 'error';
  key: string;
  timestamp: Date;
  duration: number;
  size?: number;
  error?: Error;
}

export interface SlowQuery {
  key: string;
  duration: number;
  timestamp: Date;
  operation: string;
}

export interface CacheError {
  key: string;
  error: Error;
  timestamp: Date;
  operation: string;
}

const defaultCacheConfig: CacheConfig = {
  redis: {
    enabled: true,
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'open-hivemind:',
    ttl: 3600, // 1 hour
    maxRetries: 3,
    retryDelay: 1000,
  },
  memory: {
    enabled: true,
    maxSize: 100, // 100MB
    ttl: 300, // 5 minutes
    cleanupInterval: 60, // 1 minute
    compression: true,
  },
  api: {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: true,
    cacheControl: 'public, max-age=300, stale-while-revalidate=3600',
  },
  strategies: {
    botData: {
      type: 'hybrid',
      ttl: 600, // 10 minutes
      compression: true,
      invalidationKeys: ['bot:*', 'config:*'],
      warmUp: true,
      priority: 'high',
    },
    userData: {
      type: 'redis',
      ttl: 1800, // 30 minutes
      compression: false,
      invalidationKeys: ['user:*', 'auth:*'],
      warmUp: false,
      priority: 'high',
    },
    analytics: {
      type: 'redis',
      ttl: 3600, // 1 hour
      compression: true,
      invalidationKeys: ['analytics:*', 'metrics:*'],
      warmUp: true,
      priority: 'medium',
    },
    config: {
      type: 'memory',
      ttl: 7200, // 2 hours
      compression: false,
      invalidationKeys: ['config:*', 'settings:*'],
      warmUp: true,
      priority: 'high',
    },
    dashboard: {
      type: 'hybrid',
      ttl: 300, // 5 minutes
      compression: true,
      invalidationKeys: ['dashboard:*', 'widget:*'],
      warmUp: true,
      priority: 'medium',
    },
  },
};

// Mock cache implementation for demonstration
class MockCache {
  private memory = new Map<string, CacheEntry>();
  private events: CacheEvent[] = [];
  private slowQueries: SlowQuery[] = [];
  private errors: CacheError[] = [];
  private subscribers: Array<(event: CacheEvent) => void> = [];
  private stats: CacheStats;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.stats = this.initializeStats();
  }

  private initializeStats(): CacheStats {
    return {
      memory: {
        used: 0,
        available: this.config.memory.maxSize * 1024 * 1024,
        peak: 0,
        entries: 0,
      },
      redis: {
        connected: this.config.redis.enabled,
        usedMemory: 0,
        peakMemory: 0,
        keys: 0,
        commands: 0,
      },
      performance: {
        hitRate: 0,
        avgResponseTime: 0,
        slowQueries: 0,
        errors: 0,
      },
      strategies: {},
    };
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    try {
      const entry = this.memory.get(key);
      const duration = performance.now() - startTime;

      if (entry) {
        const now = Date.now();
        if (now - entry.createdAt.getTime() > entry.ttl * 1000) {
          this.memory.delete(key);
          this.emitEvent('miss', key, duration);
          this.recordSlowQuery(key, duration, 'get');
          return null;
        }

        entry.lastAccessed = new Date();
        entry.accessCount++;
        this.emitEvent('hit', key, duration, entry.size);
        this.updateStats('hit', key, entry);
        return entry.value as T;
      }

      this.emitEvent('miss', key, duration);
      this.recordSlowQuery(key, duration, 'get');
      this.updateStats('miss', key);
      return null;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordError(key, error as Error, 'get');
      this.emitEvent('error', key, duration, undefined, error as Error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const startTime = performance.now();
    try {
      const strategy = this.config.strategies[options?.strategy || 'botData'];
      const ttl = options?.ttl || strategy.ttl;
      const compressed = options?.compression ?? strategy.compression;
      
      const entry: CacheEntry<T> = {
        key,
        value,
        ttl,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        compressed,
        size: this.calculateSize(value),
        tags: options?.tags || [],
      };

      this.memory.set(key, entry);
      const duration = performance.now() - startTime;
      
      this.emitEvent('set', key, duration, entry.size);
      this.updateStats('set', key, entry);
      this.enforceMemoryLimit();
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordError(key, error as Error, 'set');
      this.emitEvent('error', key, duration, undefined, error as Error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    const startTime = performance.now();
    try {
      const existed = this.memory.has(key);
      this.memory.delete(key);
      const duration = performance.now() - startTime;
      
      this.emitEvent('del', key, duration);
      if (existed) {
        this.updateStats('del', key);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordError(key, error as Error, 'del');
      this.emitEvent('error', key, duration, undefined, error as Error);
      throw error;
    }
  }

  async clear(pattern?: string): Promise<void> {
    const startTime = performance.now();
    try {
      if (pattern) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const [key] of this.memory.entries()) {
          if (regex.test(key)) {
            this.memory.delete(key);
          }
        }
      } else {
        this.memory.clear();
      }
      
      const duration = performance.now() - startTime;
      this.emitEvent('clear', pattern || '*', duration);
      this.updateStats('clear', pattern || '*');
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordError(pattern || '*', error as Error, 'clear');
      this.emitEvent('error', pattern || '*', duration, undefined, error as Error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.memory.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    const expired = now - entry.createdAt.getTime() > entry.ttl * 1000;
    
    if (expired) {
      this.memory.delete(key);
      return false;
    }
    
    return true;
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }

  private enforceMemoryLimit(): void {
    const maxSize = this.config.memory.maxSize * 1024 * 1024;
    let currentSize = 0;
    
    for (const entry of this.memory.values()) {
      currentSize += entry.size;
    }
    
    if (currentSize > maxSize) {
      // Simple LRU eviction
      const entries = Array.from(this.memory.entries());
      entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
      
      for (const [key, entry] of entries) {
        if (currentSize <= maxSize * 0.8) break;
        this.memory.delete(key);
        currentSize -= entry.size;
      }
    }
  }

  private emitEvent(type: CacheEvent['type'], key: string, duration: number, size?: number, error?: Error): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: new Date(),
      duration,
      size,
      error,
    };
    
    this.events.push(event);
    this.subscribers.forEach(callback => callback(event));
    
    if (type === 'error') {
      this.stats.performance.errors++;
    }
  }

  private recordSlowQuery(key: string, duration: number, operation: string): void {
    if (duration > 100) { // Queries taking more than 100ms
      this.slowQueries.push({
        key,
        duration,
        timestamp: new Date(),
        operation,
      });
      
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
    }
  }

  private recordError(key: string, error: Error, operation: string): void {
    this.errors.push({
      key,
      error,
      timestamp: new Date(),
      operation,
    });
    
    if (this.errors.length > 100) {
      this.errors.shift();
    }
  }

  private updateStats(operation: string, key: string, entry?: CacheEntry): void {
    // Update memory stats
    this.stats.memory.entries = this.memory.size;
    this.stats.memory.used = Array.from(this.memory.values()).reduce((sum, entry) => sum + entry.size, 0);
    this.stats.memory.peak = Math.max(this.stats.memory.peak, this.stats.memory.used);
    this.stats.memory.available = this.config.memory.maxSize * 1024 * 1024 - this.stats.memory.used;
    
    // Update performance stats
    const totalRequests = this.events.filter(e => ['hit', 'miss'].includes(e.type)).length;
    const hits = this.events.filter(e => e.type === 'hit').length;
    this.stats.performance.hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;
    
    if (entry) {
      const strategy = this.getStrategyForKey(key);
      if (strategy) {
        if (!this.stats.strategies[strategy]) {
          this.stats.strategies[strategy] = {
            hits: 0,
            misses: 0,
            evictions: 0,
            avgTtl: 0,
            compressionRatio: 0,
          };
        }
        
        if (operation === 'hit') {
          this.stats.strategies[strategy].hits++;
        } else if (operation === 'miss') {
          this.stats.strategies[strategy].misses++;
        }
      }
    }
  }

  private getStrategyForKey(key: string): string | null {
    for (const [strategyName, strategy] of Object.entries(this.config.strategies)) {
      if (strategy.invalidationKeys.some(pattern => 
        new RegExp(pattern.replace('*', '.*')).test(key)
      )) {
        return strategyName;
      }
    }
    return null;
  }

  getMetrics(): CacheMetrics {
    const totalRequests = this.events.filter(e => ['hit', 'miss'].includes(e.type)).length;
    const hits = this.events.filter(e => e.type === 'hit').length;
    const misses = this.events.filter(e => e.type === 'miss').length;
    
    return {
      hitRate: totalRequests > 0 ? (hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (misses / totalRequests) * 100 : 0,
      evictionRate: 0, // Simplified for demo
      memoryUsage: this.stats.memory.used,
      redisUsage: this.stats.redis.usedMemory,
      totalRequests,
      cacheHits: hits,
      cacheMisses: misses,
      averageResponseTime: this.stats.performance.avgResponseTime,
      compressionRatio: 0, // Simplified for demo
      keysCount: this.memory.size,
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getEntries(): CacheEntry[] {
    return Array.from(this.memory.values());
  }

  subscribe(callback: (event: CacheEvent) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  getSlowQueries(): SlowQuery[] {
    return [...this.slowQueries];
  }

  getErrors(): CacheError[] {
    return [...this.errors];
  }

  clearAll(): Promise<void> {
    return this.clear();
  }

  resetStats(): void {
    this.stats = this.initializeStats();
    this.events = [];
    this.slowQueries = [];
    this.errors = [];
  }
}

interface CacheProviderProps {
  children: React.ReactNode;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<CacheConfig>(defaultCacheConfig);
  const [cache] = useState<MockCache>(new MockCache(config));
  const [isConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<CacheMetrics>(cache.getMetrics());
  const [stats, setStats] = useState<CacheStats>(cache.getStats());
  const [entries, setEntries] = useState<CacheEntry[]>(cache.getEntries());
  const [events, setEvents] = useState<CacheEvent[]>([]);

  useEffect(() => {
    const unsubscribe = cache.subscribe((event) => {
      setEvents(prev => [...prev, event].slice(-100)); // Keep last 100 events
      setMetrics(cache.getMetrics());
      setStats(cache.getStats());
      setEntries(cache.getEntries());
    });

    return () => {
      unsubscribe();
    };
  }, [cache]);

  const get = useCallback(async <T,>(key: string, strategy?: keyof CacheConfig['strategies']): Promise<T | null> => {
    return cache.get<T>(key, strategy);
  }, [cache]);

  const set = useCallback(async <T,>(key: string, value: T, options?: CacheSetOptions): Promise<void> => {
    return cache.set<T>(key, value, options);
  }, [cache]);

  const del = useCallback(async (key: string): Promise<void> => {
    return cache.del(key);
  }, [cache]);

  const clear = useCallback(async (pattern?: string): Promise<void> => {
    return cache.clear(pattern);
  }, [cache]);

  const has = useCallback(async (key: string): Promise<boolean> => {
    return cache.has(key);
  }, [cache]);

  const getMany = useCallback(async <T,>(keys: string[]): Promise<(T | null)[]> => {
    return Promise.all(keys.map(key => get<T>(key)));
  }, [get]);

  const setMany = useCallback(async <T,>(entries: Array<{ key: string; value: T; options?: CacheSetOptions }>): Promise<void> => {
    await Promise.all(entries.map(({ key, value, options }) => set<T>(key, value, options)));
  }, [set]);

  const invalidateByTags = useCallback(async (tags: string[]): Promise<void> => {
    const entriesToInvalidate = entries.filter(entry => 
      entry.tags.some(tag => tags.includes(tag))
    );
    
    await Promise.all(entriesToInvalidate.map(entry => del(entry.key)));
  }, [entries, del]);

  const invalidateByPattern = useCallback(async (pattern: string): Promise<void> => {
    return cache.clear(pattern);
  }, [cache]);

  const warmUp = useCallback(async (strategy: keyof CacheConfig['strategies']): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate warm-up process
      // const strategyConfig = config.strategies[strategy];
      const mockKeys = [
        `${strategy}:1`,
        `${strategy}:2`,
        `${strategy}:3`,
      ];
      
      // Pre-populate cache with mock data
      await Promise.all(mockKeys.map(key => 
        set(key, { warmed: true, timestamp: Date.now() }, { strategy })
      ));
      
      console.log(`Cache warmed up for strategy: ${strategy}`);
    } finally {
      setIsLoading(false);
    }
  }, [config.strategies, set]);

  const optimize = useCallback(async (strategy?: keyof CacheConfig['strategies']): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate optimization process
      if (strategy) {
        console.log(`Optimizing cache for strategy: ${strategy}`);
      } else {
        console.log('Optimizing entire cache');
      }
      
      // Clear old entries
      const now = Date.now();
      const oldEntries = entries.filter(entry => 
        now - entry.createdAt.getTime() > entry.ttl * 1000
      );
      
      await Promise.all(oldEntries.map(entry => del(entry.key)));
      
      console.log(`Optimized cache, removed ${oldEntries.length} old entries`);
    } finally {
      setIsLoading(false);
    }
  }, [entries, del]);

  const updateConfig = useCallback(async (updates: Partial<CacheConfig>): Promise<void> => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetStats = useCallback(() => {
    cache.resetStats();
    setMetrics(cache.getMetrics());
    setStats(cache.getStats());
    setEvents([]);
  }, [cache]);

  const clearAll = useCallback(async () => {
    await cache.clearAll();
  }, [cache]);

  // Utility functions
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDuration = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }, []);

  const getHealthStatus = useCallback((): 'healthy' | 'warning' | 'critical' => {
    if (metrics.hitRate < 50) return 'critical';
    if (metrics.hitRate < 70) return 'warning';
    return 'healthy';
  }, [metrics.hitRate]);

  const contextValue: CacheContextType = {
    config,
    isConnected,
    isLoading,
    metrics,
    stats,
    entries,
    get,
    set,
    del,
    clear,
    has,
    getMany,
    setMany,
    invalidateByTags,
    invalidateByPattern,
    warmUp,
    optimize,
    updateConfig,
    resetStats,
    clearAll,
    subscribe: cache.subscribe.bind(cache),
    getSlowQueries: cache.getSlowQueries.bind(cache),
    getErrors: cache.getErrors.bind(cache),
    formatBytes,
    formatDuration,
    getHealthStatus,
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <StorageIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Cache Management
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access cache management features.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <CacheContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* Cache Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <StorageIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    Cache Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hit Rate: {metrics.hitRate.toFixed(1)}% • {entries.length} entries • {formatBytes(metrics.memoryUsage)} used
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={isConnected ? 'Connected' : 'Disconnected'}
                  size="small"
                  color={isConnected ? 'success' : 'error'}
                  icon={isConnected ? <CheckIcon /> : <WarningIcon />}
                />
                <Chip
                  label={getHealthStatus()}
                  size="small"
                  color={getHealthStatus() === 'healthy' ? 'success' : getHealthStatus() === 'warning' ? 'warning' : 'error'}
                />
                <IconButton onClick={resetStats} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color={metrics.hitRate > 80 ? 'success.main' : metrics.hitRate > 60 ? 'warning.main' : 'error.main'}>
                    {metrics.hitRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hit Rate
                  </Typography>
                  {metrics.hitRate > metrics.missRate ? (
                    <TrendingIcon color="success" />
                  ) : (
                    <TrendingDownIcon color="error" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {formatDuration(metrics.averageResponseTime)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                  <SpeedIcon color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {entries.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cached Entries
                  </Typography>
                  <DataUsageIcon color="info" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {stats.slowQueries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Slow Queries
                  </Typography>
                  <TimeIcon color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Strategy Performance */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cache Strategy Performance
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Strategy</TableCell>
                    <TableCell align="right">Hits</TableCell>
                    <TableCell align="right">Misses</TableCell>
                    <TableCell align="right">Hit Rate</TableCell>
                    <TableCell align="right">Priority</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(config.strategies).map(([name, strategy]) => {
                    const statsForStrategy = stats.strategies[name] || { hits: 0, misses: 0 };
                    const total = statsForStrategy.hits + statsForStrategy.misses;
                    const hitRate = total > 0 ? (statsForStrategy.hits / total) * 100 : 0;
                    
                    return (
                      <TableRow key={name}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon color="primary" />
                            <Typography variant="body2" fontWeight="medium">
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{statsForStrategy.hits}</TableCell>
                        <TableCell align="right">{statsForStrategy.misses}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${hitRate.toFixed(1)}%`}
                            size="small"
                            color={hitRate > 80 ? 'success' : hitRate > 60 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={strategy.priority}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => warmUp(name as keyof CacheConfig['strategies'])}
                            disabled={isLoading}
                          >
                            Warm Up
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Memory Usage
            </Typography>
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Used: {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.available + stats.memory.used)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.memory.used / (stats.memory.available + stats.memory.used)) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'action.disabledBackground',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: (stats.memory.used / (stats.memory.available + stats.memory.used)) > 0.8 ? 'error.main' : 'primary.main',
                  },
                }}
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Peak Usage: {formatBytes(stats.memory.peak)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Entries: {stats.memory.entries}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Cache Events ({events.length})
            </Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {events.slice(-10).reverse().map((event, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {event.type === 'hit' && <CheckIcon color="success" />}
                    {event.type === 'miss' && <WarningIcon color="warning" />}
                    {event.type === 'set' && <StorageIcon color="info" />}
                    {event.type === 'del' && <ClearIcon color="error" />}
                    {event.type === 'error' && <WarningIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${event.type.toUpperCase()}: ${event.key}`}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatDuration(event.duration)}
                        </Typography>
                        {event.size && (
                          <Typography variant="caption" color="text.secondary">
                            {formatBytes(event.size)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {event.timestamp.toLocaleTimeString()}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </AnimatedBox>
    </CacheContext.Provider>
  );
};

// Export hook for using cache context
export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

// Export types and utilities
export type { CacheConfig, CacheEntry, CacheMetrics, CacheStats, CacheStrategy, CacheEvent, CacheContextType };

export { CacheContext };

export default CacheProvider;