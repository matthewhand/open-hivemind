/**
 * Performance Monitoring Dashboard - Real-time performance metrics and optimization insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiCache } from '../../services/apiCache';
import { wsOptimization } from '../../services/wsOptimization';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import { LoadingSpinner } from '../DaisyUI/Loading';

interface PerformanceMetrics {
  apiCalls: {
    total: number;
    cached: number;
    hitRate: number;
    averageResponseTime: number;
  };
  websocket: {
    activeConnections: number;
    broadcastsSaved: number;
    payloadReduction: number;
  };
  components: {
    renderCount: number;
    slowComponents: Array<{ name: string; renderTime: number }>;
  };
  memory: {
    usage: number;
    cacheSize: number;
    leaks: number;
  };
}

interface OptimizationSuggestion {
  type: 'api' | 'websocket' | 'component' | 'memory';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
}

const PerformanceMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      // Get cache statistics
      const cacheStats = apiCache.getStats();
      
      // Get WebSocket optimization stats
      const wsStats = wsOptimization.getStats();
      
      // Get performance metrics (would come from actual performance API)
      const performanceData: PerformanceMetrics = {
        apiCalls: {
          total: 150,
          cached: Math.floor(150 * cacheStats.hitRate),
          hitRate: cacheStats.hitRate,
          averageResponseTime: 245
        },
        websocket: {
          activeConnections: 3,
          broadcastsSaved: wsStats.totalBroadcastsSaved,
          payloadReduction: wsStats.averagePayloadReduction
        },
        components: {
          renderCount: 42,
          slowComponents: [
            { name: 'ModelAutocomplete', renderTime: 15 },
            { name: 'AgentConfigurator', renderTime: 12 },
            { name: 'MonitoringDashboard', renderTime: 8 }
          ]
        },
        memory: {
          usage: 45.2,
          cacheSize: cacheStats.size,
          leaks: 0
        }
      };

      setMetrics(performanceData);
      
      // Generate optimization suggestions
      const newSuggestions = generateSuggestions(performanceData, cacheStats, wsStats);
      setSuggestions(newSuggestions);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSuggestions = (
    metrics: PerformanceMetrics,
    cacheStats: any,
    wsStats: any
  ): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // API optimization suggestions
    if (metrics.apiCalls.hitRate < 0.6) {
      suggestions.push({
        type: 'api',
        severity: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${(metrics.apiCalls.hitRate * 100).toFixed(1)}%. Consider increasing cache TTL for stable endpoints.`,
        action: 'Review cache configuration and increase TTL for configuration endpoints'
      });
    }

    if (metrics.apiCalls.averageResponseTime > 500) {
      suggestions.push({
        type: 'api',
        severity: 'high',
        title: 'High API Response Time',
        description: `Average response time is ${metrics.apiCalls.averageResponseTime}ms. Consider implementing request batching.`,
        action: 'Implement API request batching and optimize slow endpoints'
      });
    }

    // WebSocket optimization suggestions
    if (wsStats.activeThrottles > 10) {
      suggestions.push({
        type: 'websocket',
        severity: 'medium',
        title: 'High WebSocket Activity',
        description: `${wsStats.activeThrottles} active throttles detected. Consider increasing throttle intervals.`,
        action: 'Optimize WebSocket broadcast frequency and batch similar events'
      });
    }

    // Component optimization suggestions
    const slowComponents = metrics.components.slowComponents.filter(c => c.renderTime > 10);
    if (slowComponents.length > 0) {
      suggestions.push({
        type: 'component',
        severity: 'medium',
        title: 'Slow Component Renders',
        description: `${slowComponents.length} components have render times > 10ms. Consider memoization.`,
        action: 'Implement React.memo and useMemo for expensive components'
      });
    }

    // Memory optimization suggestions
    if (metrics.memory.usage > 80) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Memory usage is ${metrics.memory.usage}%. Consider clearing unused cache entries.`,
        action: 'Implement cache eviction policies and memory cleanup'
      });
    }

    return suggestions;
  };

  const clearCache = () => {
    apiCache.clear();
    fetchMetrics();
  };

  const optimizeWebSocket = () => {
    wsOptimization.updateConfig({
      throttleMs: 200,
      batchSize: 5,
      maxPendingTime: 1000
    });
    fetchMetrics();
  };

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-3">Loading performance metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        status="error"
        message={error}
        action={
          <button onClick={fetchMetrics} className="btn btn-sm btn-outline">
            Retry
          </button>
        }
      />
    );
  }

  if (!metrics) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-base-content/60">Real-time performance metrics and optimization insights</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button onClick={fetchMetrics} className="btn btn-sm btn-outline">
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* API Performance */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">API Performance</h3>
            <Badge variant={metrics.apiCalls.hitRate > 0.7 ? 'success' : 'warning'} size="small">
              {(metrics.apiCalls.hitRate * 100).toFixed(1)}% hit rate
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total calls:</span>
              <span className="font-mono">{metrics.apiCalls.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Cached:</span>
              <span className="font-mono text-success">{metrics.apiCalls.cached}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg response:</span>
              <span className="font-mono">{metrics.apiCalls.averageResponseTime}ms</span>
            </div>
          </div>
        </Card>

        {/* WebSocket Performance */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">WebSocket</h3>
            <Badge variant="info" size="small">
              {metrics.websocket.activeConnections} active
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Broadcasts saved:</span>
              <span className="font-mono text-success">{metrics.websocket.broadcastsSaved}</span>
            </div>
            <div className="flex justify-between">
              <span>Payload reduction:</span>
              <span className="font-mono">{(metrics.websocket.payloadReduction * 100).toFixed(1)}%</span>
            </div>
          </div>
        </Card>

        {/* Component Performance */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Components</h3>
            <Badge variant="neutral" size="small">
              {metrics.components.renderCount} renders
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-xs text-base-content/60">Slowest components:</div>
            {metrics.components.slowComponents.slice(0, 2).map((comp, i) => (
              <div key={i} className="flex justify-between">
                <span className="truncate">{comp.name}</span>
                <span className="font-mono">{comp.renderTime}ms</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Memory Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Memory</h3>
            <Badge variant={metrics.memory.usage > 80 ? 'error' : 'success'} size="small">
              {metrics.memory.usage.toFixed(1)}%
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cache entries:</span>
              <span className="font-mono">{metrics.memory.cacheSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Memory leaks:</span>
              <span className="font-mono text-success">{metrics.memory.leaks}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Optimization Suggestions</h3>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(suggestion.severity)} size="small">
                      {suggestion.severity}
                    </Badge>
                    <h4 className="font-medium">{suggestion.title}</h4>
                  </div>
                  <Badge variant="neutral" size="small">
                    {suggestion.type}
                  </Badge>
                </div>
                <p className="text-sm text-base-content/70 mb-2">{suggestion.description}</p>
                <p className="text-sm font-medium text-primary">{suggestion.action}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={clearCache} className="btn btn-sm btn-outline">
            Clear API Cache
          </button>
          <button onClick={optimizeWebSocket} className="btn btn-sm btn-outline">
            Optimize WebSocket
          </button>
          <button onClick={() => window.location.reload()} className="btn btn-sm btn-outline">
            Force Refresh
          </button>
        </div>
      </Card>
    </div>
  );
};

export default PerformanceMonitoringDashboard;