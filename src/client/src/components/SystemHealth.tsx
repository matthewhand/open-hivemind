/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Loading,
  Badge,
  Alert,
  Accordion,
  Divider,
} from './DaisyUI';
import {
  ChevronDown,
  Cpu,
  Zap,
  HardDrive,
  Signal,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { apiService } from '../services/api';

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
  refreshInterval = 30000,
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [healthData, endpointsData] = await Promise.all([
            apiService.getSystemHealth(),
            apiService.getApiEndpointsStatus().catch(() => null) // Handle failure gracefully
        ]);

        // Map API response to SystemMetrics
        // Note: Some fields are not returned by /health/detailed, so we use placeholders
        const mappedMetrics: SystemMetrics = {
          cpu: {
            usage: (healthData.cpu.user + healthData.cpu.system) || 0,
            cores: 0, // Not provided by API currently
            temperature: undefined, // Not provided
          },
          memory: {
            used: healthData.memory.used,
            total: healthData.memory.total,
            usage: healthData.memory.usage,
          },
          disk: {
            used: 0, // Not provided
            total: 0, // Not provided
            usage: 0,
          },
          network: {
            latency: 0, // Not provided
            status: 'online', // Assume online if we fetched data
          },
          uptime: healthData.uptime,
          loadAverage: healthData.system.loadAverage || [0, 0, 0],
        };

        setMetrics(mappedMetrics);

        // Map Endpoints to HealthChecks
        if (endpointsData) {
            const checks: HealthCheck[] = endpointsData.endpoints.map(ep => ({
                id: ep.id,
                name: ep.name,
                status: ep.status === 'online' ? 'healthy' : ep.status === 'slow' ? 'warning' : 'error',
                message: ep.errorMessage || ep.status,
                lastChecked: ep.lastChecked,
                details: `Response time: ${ep.responseTime}ms`
            }));
            setHealthChecks(checks);
        } else {
            // Fallback if endpoints endpoint fails or returns nothing
            setHealthChecks([]);
        }

        setLastRefresh(new Date());
      } catch (err) {
        console.error("Failed to fetch system health:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchSystemData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    const className = 'w-5 h-5';
    switch (status) {
    case 'healthy':
    case 'online':
      return <CheckCircle className={`${className} text-success`} />;
    case 'warning':
    case 'slow':
      return <AlertTriangle className={`${className} text-warning`} />;
    case 'error':
    case 'offline':
      return <AlertCircle className={`${className} text-error`} />;
    default:
      return <Info className={`${className} text-info`} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'healthy':
    case 'online':
      return 'success';
    case 'warning':
    case 'slow':
      return 'warning';
    case 'error':
    case 'offline':
      return 'error';
    default:
      return 'ghost';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {return `${days}d ${hours}h ${minutes}m`;}
    if (hours > 0) {return `${hours}h ${minutes}m`;}
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
    if (ms < 50) {return `${ms.toFixed(0)}ms`;}
    if (ms < 1000) {return `${ms.toFixed(0)}ms`;}
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getOverallHealth = () => {
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;

    if (errorCount > 0) {return { status: 'error', message: `${errorCount} critical issues detected` };}
    if (warningCount > 0) {return { status: 'warning', message: `${warningCount} warnings detected` };}
    return { status: 'healthy', message: 'All systems operational' };
  };

  const overallHealth = getOverallHealth();

  if (loading) {
    return (
      <Card>
        <Card.Body>
          <div className="flex justify-center items-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-2 text-base-content/70">
              Loading system health data...
            </span>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const accordionItems = [
    {
      id: 'system-info',
      title: 'System Information',
      icon: 'ℹ️',
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm">• CPU Load: {(metrics?.loadAverage[0] || 0).toFixed(2)} (1m), {(metrics?.loadAverage[1] || 0).toFixed(2)} (5m), {(metrics?.loadAverage[2] || 0).toFixed(2)} (15m)</p>
            <p className="text-sm">• Memory Available: {formatBytes((metrics?.memory.total || 0) - (metrics?.memory.used || 0))}</p>
            <p className="text-sm">• Disk Available: {metrics?.disk.total ? formatBytes((metrics?.disk.total || 0) - (metrics?.disk.used || 0)) : 'N/A'}</p>
          </div>
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Network Status</h4>
            <p className="text-sm">• Connection Status: {metrics?.network.status}</p>
            <p className="text-sm">• Response Time: {formatLatency(metrics?.network.latency || 0)}</p>
            <p className="text-sm">• System Uptime: {formatUptime(metrics?.uptime || 0)}</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Card.Body>
        <div className="flex justify-between items-center mb-6">
          <Card.Title>
            System Health Monitor
          </Card.Title>
          {lastRefresh && (
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Overall Health Status */}
        <div className="mb-6">
          <Alert
            variant={overallHealth.status === 'healthy' ? 'success' : overallHealth.status === 'warning' ? 'warning' : 'error'}
            icon={getStatusIcon(overallHealth.status)}
          >
            {overallHealth.message}
          </Alert>
        </div>

        {/* System Metrics */}
        <h3 className="text-lg font-bold mb-4 mt-2">
          System Metrics
        </h3>

        <div className="flex flex-wrap gap-4 mb-6">
          {/* CPU Usage */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 mr-2" />
                  <span className="font-medium">CPU Usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <progress
                      className={`progress w-full ${(metrics?.cpu.usage || 0) > 80 ? 'progress-error' : (metrics?.cpu.usage || 0) > 60 ? 'progress-warning' : 'progress-success'}`}
                      value={metrics?.cpu.usage || 0}
                      max="100"
                    ></progress>
                  </div>
                  <span className="text-sm">
                    {(metrics?.cpu.usage || 0).toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  {metrics?.cpu.cores ? `${metrics.cpu.cores} cores` : 'Unknown cores'} • {metrics?.cpu.temperature ? `${metrics.cpu.temperature.toFixed(0)}°C` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Cpu className="w-5 h-5 mr-2" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <progress
                      className={`progress w-full ${(metrics?.memory.usage || 0) > 90 ? 'progress-error' : (metrics?.memory.usage || 0) > 70 ? 'progress-warning' : 'progress-success'}`}
                      value={metrics?.memory.usage || 0}
                      max="100"
                    ></progress>
                  </div>
                  <span className="text-sm">
                    {(metrics?.memory.usage || 0).toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <HardDrive className="w-5 h-5 mr-2" />
                  <span className="font-medium">Disk Usage</span>
                </div>
                {metrics?.disk.total ? (
                    <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <progress
                        className={`progress w-full ${(metrics?.disk.usage || 0) > 90 ? 'progress-error' : (metrics?.disk.usage || 0) > 80 ? 'progress-warning' : 'progress-success'}`}
                        value={metrics?.disk.usage || 0}
                        max="100"
                        ></progress>
                    </div>
                    <span className="text-sm">
                        {(metrics?.disk.usage || 0).toFixed(1)}%
                    </span>
                    </div>
                ) : (
                    <div className="text-sm text-base-content/50 italic">Not available</div>
                )}
                <span className="text-xs text-base-content/70 mt-1">
                  {metrics?.disk.total ? `${formatBytes(metrics?.disk.used || 0)} / ${formatBytes(metrics?.disk.total || 0)}` : 'Disk info unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Signal className="w-5 h-5 mr-2" />
                  <span className="font-medium">Network Status</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={getStatusColor(metrics?.network.status || 'unknown') as any}
                    size="sm"
                  >
                    {metrics?.network.status || 'unknown'}
                  </Badge>
                  <span className="text-sm">
                    {formatLatency(metrics?.network.latency || 0)}
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  System uptime: {formatUptime(metrics?.uptime || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Load Average */}
        <h3 className="text-lg font-bold mb-4">
          Load Average
        </h3>
        <div className="flex gap-2 mb-6">
          {metrics?.loadAverage.map((load, index) => (
            <Badge
              key={index}
              variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'success'}
              size="lg"
            >
              {`${index + 1}m: ${load.toFixed(2)}`}
            </Badge>
          ))}
        </div>

        {/* Health Checks */}
        <h3 className="text-lg font-bold mb-4">
          Health Checks
        </h3>

        {healthChecks.length > 0 ? (
            <ul className="menu bg-base-200 w-full rounded-box mb-6">
            {healthChecks.map((check, index) => (
                <React.Fragment key={check.id}>
                <li>
                    <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{check.name}</span>
                            <Badge
                            variant={getStatusColor(check.status) as any}
                            size="sm"
                            >
                            {check.status}
                            </Badge>
                        </div>
                        <div className="text-sm text-base-content/70 mt-1">
                            {check.message}
                        </div>
                        <div className="text-xs text-base-content/50 mt-1">
                            Last checked: {new Date(check.lastChecked).toLocaleString()}
                        </div>
                        </div>
                    </div>
                    </div>
                </li>
                {index < healthChecks.length - 1 && <Divider className="my-0" />}
                </React.Fragment>
            ))}
            </ul>
        ) : (
            <div className="alert alert-info mb-6">No health checks configured or available.</div>
        )}

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;