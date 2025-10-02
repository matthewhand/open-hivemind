import React, { useState, useEffect } from 'react';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
 };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    latency: number;
    status: 'online' | 'offline' | 'slow';
  };
  uptime: number;
  loadAverage: number[];
}

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: string;
  details?: string;
}

const SystemHealth: React.FC<SystemHealthProps> = ({
  refreshInterval = 30000
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false); // State for accordion

  // Mock data for demonstration - in real implementation, this would come from API
  useEffect(() => {
    const fetchSystemData = () => {
      const mockMetrics: SystemMetrics = {
        cpu: {
          usage: Math.random() * 100,
          cores: 8,
          temperature: 45 + Math.random() * 20,
        },
        memory: {
          used: Math.random() * 16 * 1024, // GB
          total: 16 * 1024, // 16GB
          usage: Math.random() * 100,
        },
        disk: {
          used: Math.random() * 500, // GB
          total: 500, // 500GB
          usage: Math.random() * 100,
        },
        network: {
          latency: 20 + Math.random() * 50, // ms
          status: Math.random() > 0.9 ? 'slow' : Math.random() > 0.95 ? 'offline' : 'online',
        },
        uptime: Math.random() * 86400 * 7, // Up to 7 days
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
      };

      const mockHealthChecks: HealthCheck[] = [
        {
          id: '1',
          name: 'Database Connection',
          status: 'healthy',
          message: 'All database connections are operational',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '2',
          name: 'Discord API',
          status: Math.random() > 0.9 ? 'warning' : 'healthy',
          message: Math.random() > 0.9 ? 'High API response time detected' : 'Discord API is responding normally',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '3',
          name: 'LLM Services',
          status: Math.random() > 0.95 ? 'error' : Math.random() > 0.85 ? 'warning' : 'healthy',
          message: Math.random() > 0.95 ? 'OpenAI API is currently unavailable' : Math.random() > 0.85 ? 'Some LLM providers experiencing issues' : 'All LLM services are operational',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '4',
          name: 'Message Queue',
          status: 'healthy',
          message: 'Message processing is running smoothly',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '5',
          name: 'Cache System',
          status: Math.random() > 0.9 ? 'warning' : 'healthy',
          message: Math.random() > 0.9 ? 'Cache hit rate is below optimal' : 'Cache system is performing well',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setHealthChecks(mockHealthChecks);
      setLastRefresh(new Date());
      setLoading(false);
    };

    fetchSystemData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchSystemData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
      case 'slow':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
      case 'offline':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 1-2 0 1 1 0 012 0zM9 9a1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-success text-success-content';
      case 'warning':
      case 'slow':
        return 'bg-warning text-warning-content';
      case 'error':
      case 'offline':
        return 'bg-error text-error-content';
      default:
        return 'bg-neutral text-neutral-content';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 50) return `${ms.toFixed(0)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getOverallHealth = () => {
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;

    if (errorCount > 0) return { status: 'error', message: `${errorCount} critical issues detected` };
    if (warningCount > 0) return { status: 'warning', message: `${warningCount} warnings detected` };
    return { status: 'healthy', message: 'All systems operational' };
  };

  const overallHealth = getOverallHealth();

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-center items-center py-4">
            <span className="loading loading-spinner loading-md"></span>
            <span className="ml-2">Loading system health data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">System Health Monitor</h3>
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Overall Health Status */}
        <div className={`alert ${overallHealth.status === 'healthy' ? 'alert-success' : overallHealth.status === 'warning' ? 'alert-warning' : 'alert-error'} mb-3`}>
          <div className="flex items-center">
            {getStatusIcon(overallHealth.status)}
            <span>{overallHealth.message}</span>
          </div>
        </div>

        {/* System Metrics */}
        <h4 className="text-md font-semibold mb-2 mt-2">System Metrics</h4>

        <div className="flex flex-wrap gap-2 mb-3">
          {/* CPU Usage */}
          <div className="flex-1 min-w-[300px]">
            <div className="card bg-base-100 shadow-md border border-gray-200">
              <div className="card-body p-4">
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          (metrics?.cpu.usage || 0) > 80 ? 'bg-error' : (metrics?.cpu.usage || 0) > 60 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${metrics?.cpu.usage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm">{(metrics?.cpu.usage || 0).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-gray-500">
                  {metrics?.cpu.cores} cores • {metrics?.cpu.temperature?.toFixed(0)}°C
                </span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="flex-1 min-w-[300px]">
            <div className="card bg-base-100 shadow-md border border-gray-200">
              <div className="card-body p-4">
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          (metrics?.memory.usage || 0) > 90 ? 'bg-error' : (metrics?.memory.usage || 0) > 70 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${metrics?.memory.usage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm">{(metrics?.memory.usage || 0).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="flex-1 min-w-[300px]">
            <div className="card bg-base-100 shadow-md border border-gray-200">
              <div className="card-body p-4">
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                    <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                  </svg>
                  <span className="text-sm font-medium">Disk Usage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          (metrics?.disk.usage || 0) > 90 ? 'bg-error' : (metrics?.disk.usage || 0) > 80 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${metrics?.disk.usage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm">{(metrics?.disk.usage || 0).toFixed(1)}%</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatBytes(metrics?.disk.used || 0)} / {formatBytes(metrics?.disk.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="flex-1 min-w-[300px]">
            <div className="card bg-base-100 shadow-md border border-gray-200">
              <div className="card-body p-4">
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 13.047 14.01c-.04.3-.068.59-.068.7a2 2 0 004 0c0-.11-.028-.4-.068-.7L15.854 7.2 17.03 2.744A1 1 0 0118 2h-6zm-4 10a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Network Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`badge ${getStatusColor(metrics?.network.status || 'unknown')}`}>
                    {metrics?.network.status || 'unknown'}
                  </div>
                  <span className="text-sm">{formatLatency(metrics?.network.latency || 0)}</span>
                </div>
                <span className="text-xs text-gray-500">
                  System uptime: {formatUptime(metrics?.uptime || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Load Average */}
        <h4 className="text-md font-semibold mb-2">Load Average</h4>
        <div className="flex gap-2 mb-3">
          {metrics?.loadAverage.map((load, index) => (
            <div
              key={index}
              className={`badge ${
                load > 2 ? 'badge-error' : load > 1 ? 'badge-warning' : 'badge-success'
              }`}
            >
              {index + 1}m: {load.toFixed(2)}
            </div>
          ))}
        </div>

        {/* Health Checks */}
        <h4 className="text-md font-semibold mb-2">Health Checks</h4>

        <ul className="divide-y divide-gray-200">
          {healthChecks.map((check) => (
            <li key={check.id} className="py-2">
              <div className="flex items-center">
                <div className="mr-2">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium truncate">{check.name}</span>
                    <div className={`badge ${getStatusColor(check.status)}`}>
                      {check.status}
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500 truncate">{check.message}</p>
                    <p className="text-xs text-gray-400">
                      Last checked: {new Date(check.lastChecked).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Detailed Information Accordion */}
        <div className="mt-2 collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
          <input type="checkbox" checked={expanded} onChange={() => setExpanded(!expanded)} />
          <div className="collapse-title text-xl font-medium">
            System Information
          </div>
          <div className="collapse-content">
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[300px]">
                <h5 className="text-sm font-semibold mb-1">Performance Metrics</h5>
                <p className="text-sm">• CPU Load: {(metrics?.loadAverage[0] || 0).toFixed(2)} (1m), {(metrics?.loadAverage[1] || 0).toFixed(2)} (5m), {(metrics?.loadAverage[2] || 0).toFixed(2)} (15m)</p>
                <p className="text-sm">• Memory Available: {formatBytes((metrics?.memory.total || 0) - (metrics?.memory.used || 0))}</p>
                <p className="text-sm">• Disk Available: {formatBytes((metrics?.disk.total || 0) - (metrics?.disk.used || 0))}</p>
              </div>
              <div className="flex-1 min-w-[300px]">
                <h5 className="text-sm font-semibold mb-1">Network Status</h5>
                <p className="text-sm">• Connection Status: {metrics?.network.status}</p>
                <p className="text-sm">• Response Time: {formatLatency(metrics?.network.latency || 0)}</p>
                <p className="text-sm">• System Uptime: {formatUptime(metrics?.uptime || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;