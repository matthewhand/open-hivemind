import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Card,
  Button,
  Badge,
  Toggle
} from '../components/DaisyUI';
import {
  ServerStackIcon as StorageIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
  ArrowPathIcon as RefreshIcon,
} from '@heroicons/react/24/outline';

export interface CacheConfig {
  enabled: boolean;
  redis: { enabled: boolean; host: string; port: number };
  memory: { enabled: boolean; maxSize: number };
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  redisUsage: number;
  totalRequests: number;
  keysCount: number;
}

export interface CacheStats {
  memory: { used: number; available: number; entries: number };
  redis: { connected: boolean; usedMemory: number };
  performance: { hitRate: number; avgResponseTime: number };
}

interface CacheContextType {
  config: CacheConfig;
  isConnected: boolean;
  metrics: CacheMetrics;
  stats: CacheStats;
  clearCache: () => Promise<void>;
  updateConfig: (updates: Partial<CacheConfig>) => Promise<void>;
  formatBytes: (bytes: number) => string;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

const defaultConfig: CacheConfig = {
  enabled: true,
  redis: { enabled: false, host: 'localhost', port: 6379 },
  memory: { enabled: true, maxSize: 100 * 1024 * 1024 }, // 100MB
};

interface CacheProviderProps {
  children: React.ReactNode;
}

export const CacheProvider: React.FC<CacheProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<CacheConfig>(defaultConfig);
  const [isConnected] = useState(true);
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRate: 0.85,
    missRate: 0.15,
    memoryUsage: 45678901,
    redisUsage: 0,
    totalRequests: 12345,
    keysCount: 567,
  });
  const [stats] = useState<CacheStats>({
    memory: { used: 45678901, available: 100 * 1024 * 1024, entries: 567 },
    redis: { connected: false, usedMemory: 0 },
    performance: { hitRate: 0.85, avgResponseTime: 12.3 },
  });

  const clearCache = async (): Promise<void> => {
    setMetrics(prev => ({
      ...prev,
      memoryUsage: 0,
      keysCount: 0,
      totalRequests: 0,
    }));
  };

  const updateConfig = async (updates: Partial<CacheConfig>): Promise<void> => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const contextValue: CacheContextType = {
    config,
    isConnected,
    metrics,
    stats,
    clearCache,
    updateConfig,
    formatBytes,
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-96 p-6">
        <Card className="max-w-md text-center shadow-xl">
          <div className="p-8">
            <StorageIcon className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Cache System</h2>
            <p className="opacity-70">Please log in to access cache management.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <CacheContext.Provider value={contextValue}>
      <div className="w-full space-y-6">
        {/* Header */}
        <Card className="shadow-xl border-l-4 border-primary">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <StorageIcon className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Cache Management</h2>
                  <p className="text-sm opacity-70">
                    {formatBytes(metrics.memoryUsage)} used • {metrics.keysCount} keys • {(metrics.hitRate * 100).toFixed(1)}% hit rate
                  </p>
                </div>
              </div>
              <Badge variant={isConnected ? 'success' : 'error'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2 text-success">{(metrics.hitRate * 100).toFixed(1)}%</h3>
              <p className="text-sm opacity-70 mb-4">Cache Hit Rate</p>
              <CheckCircleIcon className="w-8 h-8 mx-auto text-success" />
            </div>
          </Card>

          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2 text-info">{formatBytes(metrics.memoryUsage)}</h3>
              <p className="text-sm opacity-70 mb-4">Memory Usage</p>
              <StorageIcon className="w-8 h-8 mx-auto text-info" />
            </div>
          </Card>

          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2 text-primary">{metrics.keysCount}</h3>
              <p className="text-sm opacity-70 mb-4">Cached Keys</p>
              <StorageIcon className="w-8 h-8 mx-auto text-primary" />
            </div>
          </Card>
        </div>

        {/* Statistics */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Cache Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-bold mb-2">Memory Cache</p>
                <div className="space-y-1 text-sm">
                  <p>Used: {formatBytes(stats.memory.used)}</p>
                  <p>Available: {formatBytes(stats.memory.available)}</p>
                  <p>Entries: {stats.memory.entries}</p>
                </div>
              </div>
              <div>
                <p className="font-bold mb-2">Performance</p>
                <div className="space-y-1 text-sm">
                  <p>Hit Rate: {(stats.performance.hitRate * 100).toFixed(1)}%</p>
                  <p>Miss Rate: {(metrics.missRate * 100).toFixed(1)}%</p>
                  <p>Avg Response: {stats.performance.avgResponseTime.toFixed(1)}ms</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Configuration */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Cache Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Memory Cache</span>
                  <Toggle
                    checked={config.memory.enabled}
                    onChange={(checked) => updateConfig({
                      memory: { ...config.memory, enabled: checked }
                    })}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Redis Cache</span>
                  <Toggle
                    checked={config.redis.enabled}
                    onChange={(checked) => updateConfig({
                      redis: { ...config.redis, enabled: checked }
                    })}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="error" onClick={clearCache}>
                <RefreshIcon className="w-4 h-4 mr-2" />
                Clear All Cache
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export default CacheProvider;