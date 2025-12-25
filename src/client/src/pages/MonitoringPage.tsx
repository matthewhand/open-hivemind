import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Server, Cpu, HardDrive, Wifi, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    rss: number;
    percentage: number;
  };
  cpu: {
    user: number;
    system: number;
    load: number[];
  };
  errors: {
    recent: number;
    total: number;
    topTypes: Array<{ type: string; count: number }>;
    health: string;
  };
  recovery: {
    circuitBreakers: number;
    activeFallbacks: number;
  };
  performance: {
    messagesProcessed: number;
    averageResponseTime: number;
    llmUsage: any;
  };
}

const API_BASE = '/api';

const MonitoringPage: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/health/detailed`);

      if (!response.ok) {
        throw new Error(`Failed to fetch health: ${response.statusText}`);
      }

      const data = await response.json();
      setHealth(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch health';
      setError(message);
      console.error('Error fetching health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, autoRefresh]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {return `${days}d ${hours}h ${mins}m`;}
    if (hours > 0) {return `${hours}h ${mins}m ${secs}s`;}
    if (mins > 0) {return `${mins}m ${secs}s`;}
    return `${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'healthy': return 'text-green-500';
    case 'degraded': return 'text-yellow-500';
    case 'unhealthy': return 'text-red-500';
    default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'unhealthy': return <AlertCircle className="w-5 h-5 text-red-500" />;
    default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const memoryPercentage = health?.memory?.percentage || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Monitoring</h1>
            <p className="text-gray-500">Real-time system health and metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="btn btn-ghost btn-sm gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto
          </label>
          <button
            onClick={fetchHealth}
            className="btn btn-outline gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : health ? (
        <>
          {/* Status Banner */}
          <div className={`alert ${health.status === 'healthy' ? 'alert-success' : health.status === 'degraded' ? 'alert-warning' : 'alert-error'}`}>
            {getStatusIcon(health.status)}
            <div>
              <h3 className="font-bold">System Status: {health.status.toUpperCase()}</h3>
              <div className="text-xs">Last updated: {new Date(health.timestamp).toLocaleString()}</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Uptime */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm">Uptime</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatUptime(health.uptime)}
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Server className="w-5 h-5" />
                    <span className="text-sm">Memory</span>
                  </div>
                  <span className={`font-bold ${memoryPercentage > 80 ? 'text-red-500' : memoryPercentage > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {health.memory.used}MB
                  </span>
                </div>
                <progress
                  className={`progress w-full ${memoryPercentage > 80 ? 'progress-error' : memoryPercentage > 60 ? 'progress-warning' : 'progress-success'}`}
                  value={memoryPercentage}
                  max={100}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{Math.round(memoryPercentage)}%</span>
                  <span>{health.memory.total}MB total</span>
                </div>
              </div>
            </div>

            {/* CPU */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Cpu className="w-5 h-5" />
                    <span className="text-sm">CPU Time</span>
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  {((health.cpu.user + health.cpu.system) / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-gray-400">
                  User: {(health.cpu.user / 1000).toFixed(1)}s | System: {(health.cpu.system / 1000).toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Wifi className="w-5 h-5" />
                    <span className="text-sm">Messages</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {health.performance.messagesProcessed}
                </div>
                <div className="text-xs text-gray-400">
                  Avg: {health.performance.averageResponseTime.toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>

          {/* Status Overview */}
          <div className="stats stats-horizontal bg-base-200 w-full">
            <div className="stat">
              <div className="stat-title">Recent Errors</div>
              <div className={`stat-value ${health.errors.recent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {health.errors.recent}
              </div>
              <div className="stat-desc">Last minute</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Errors</div>
              <div className="stat-value">{health.errors.total}</div>
              <div className="stat-desc">Since start</div>
            </div>
            <div className="stat">
              <div className="stat-title">Circuit Breakers</div>
              <div className="stat-value">{health.recovery.circuitBreakers}</div>
              <div className="stat-desc">Active</div>
            </div>
            <div className="stat">
              <div className="stat-title">Error Health</div>
              <div className={`stat-value text-sm ${getStatusColor(health.errors.health)}`}>
                {health.errors.health.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Top Error Types */}
          {health.errors.topTypes && health.errors.topTypes.length > 0 && (
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-lg">Top Error Types</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Error Type</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.errors.topTypes.map((err, i) => (
                        <tr key={i}>
                          <td className="font-mono text-sm">{err.type}</td>
                          <td><span className="badge badge-error">{err.count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500">Unable to load health data</h3>
            <p className="text-gray-400">Check that the server is running</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringPage;