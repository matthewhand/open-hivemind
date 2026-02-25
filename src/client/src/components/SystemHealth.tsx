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
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Cpu,
  Zap,
  HardDrive,
  Wifi,
  Activity,
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
          apiService.getSystemHealth().catch(() => null),
          apiService.getApiEndpointsStatus().catch(() => null)
        ]);

        if (healthData) {
          const newMetrics: SystemMetrics = {
            cpu: {
              usage: (healthData.cpu.user + healthData.cpu.system) || 0,
              cores: 0, // Not available in API
              temperature: 0, // Not available in API
            },
            memory: {
              used: healthData.memory.used,
              total: healthData.memory.total,
              usage: healthData.memory.usage,
            },
            disk: {
              used: 0, // Not available in API
              total: 0, // Not available in API
              usage: 0, // Not available in API
            },
            network: {
              latency: 0, // Not available in API
              status: endpointsData?.overall.status === 'healthy' ? 'online' : 'slow', // Infer from endpoints
            },
            uptime: healthData.uptime,
            loadAverage: healthData.system.loadAverage || [],
          };
          setMetrics(newMetrics);
        }

        if (endpointsData) {
          const newChecks: HealthCheck[] = endpointsData.endpoints.map(e => ({
            id: e.id,
            name: e.name,
            status: e.status === 'online' ? 'healthy' : e.status === 'error' ? 'error' : 'warning',
            message: e.errorMessage || e.status,
            lastChecked: e.lastChecked,
          }));
          setHealthChecks(newChecks);
        } else {
            // Fallback mock checks if API fails or is not configured
            setHealthChecks([
                {
                  id: '1',
                  name: 'System API',
                  status: healthData ? 'healthy' : 'error',
                  message: healthData ? 'System API responding' : 'System API unavailable',
                  lastChecked: new Date().toISOString(),
                }
            ]);
        }

        setLastRefresh(new Date());
      } catch (err) {
        console.error('Failed to fetch system data:', err);
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
      return 'ghost'; // Using ghost as default, though 'info' might be safer for some components
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
    if (bytes === 0) return '0 B';
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
    if (ms === 0) return '-';
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
        <div className="card-body">
          <div className="flex justify-center items-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-2 text-base-content/70">
              Loading system health data...
            </span>
          </div>
        </div>
      </Card>
    );
  }

  const accordionItems = [
    {
      id: 'system-info',
      title: 'System Information',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm">• CPU Load: {(metrics?.loadAverage?.[0] || 0).toFixed(2)} (1m), {(metrics?.loadAverage?.[1] || 0).toFixed(2)} (5m), {(metrics?.loadAverage?.[2] || 0).toFixed(2)} (15m)</p>
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
      <div className="card-body">
        <div className="flex justify-between items-center mb-6">
          <h2 className="card-title">
            System Health Monitor
          </h2>
          {lastRefresh && (
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Overall Health Status */}
        <div className="mb-6">
          <Alert
            status={overallHealth.status === 'healthy' ? 'success' : overallHealth.status === 'warning' ? 'warning' : 'error'}
            message={overallHealth.message}
            icon={getStatusIcon(overallHealth.status)}
          />
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
                  Load Average: {(metrics?.loadAverage?.[0] || 0).toFixed(2)}
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

          {/* Disk Usage (Conditional) */}
          {metrics?.disk.total ? (
            <div className="min-w-[300px] flex-1">
              <div className="card card-bordered border-base-300">
                <div className="card-body p-4">
                  <div className="flex items-center mb-2">
                    <HardDrive className="w-5 h-5 mr-2" />
                    <span className="font-medium">Disk Usage</span>
                  </div>
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
                  <span className="text-xs text-base-content/70 mt-1">
                    {formatBytes(metrics?.disk.used || 0)} / {formatBytes(metrics?.disk.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Network Status */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Wifi className="w-5 h-5 mr-2" />
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
          {metrics?.loadAverage?.map((load, index) => (
            <Badge
              key={index}
              variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'success'}
              size="lg"
            >
              {`${index === 0 ? '1m' : index === 1 ? '5m' : '15m'}: ${load.toFixed(2)}`}
            </Badge>
          ))}
        </div>

        {/* Health Checks */}
        <h3 className="text-lg font-bold mb-4">
          Health Checks
        </h3>

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
          {healthChecks.length === 0 && (
            <li className="text-center py-4 text-base-content/50">
              No health checks available
            </li>
          )}
        </ul>

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </div>
    </Card>
  );
};

export default SystemHealth;
