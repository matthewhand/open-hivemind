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
  Zap,
  Cpu,
  Server,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface SystemMetrics {
  cpu: {
    user: number;
    system: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  system: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    loadAverage: number[];
  };
  uptime: number;
  status: string;
  timestamp: string;
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
          apiService.getApiEndpointsStatus()
        ]);

        setMetrics(healthData);

        // Transform endpoints to health checks
        const checks: HealthCheck[] = endpointsData.endpoints.map(ep => ({
          id: ep.id,
          name: ep.name,
          status: ep.status === 'online' ? 'healthy' : ep.status === 'slow' ? 'warning' : 'error',
          message: ep.errorMessage || (ep.status === 'online' ? 'Operational' : 'Issues detected'),
          lastChecked: ep.lastChecked,
          details: `Response time: ${ep.responseTime}ms`
        }));

        setHealthChecks(checks);
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Failed to fetch system health:', err);
        // Fallback or error state?
        // For now, we might keep old data or show error
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

  const getOverallHealth = () => {
    if (!metrics) return { status: 'unknown', message: 'Loading...' };

    // Check endpoints
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;

    // Check system resources
    if (metrics.memory.usage > 90 || (metrics.cpu.user + metrics.cpu.system) > 90) {
      return { status: 'warning', message: 'High resource usage detected' };
    }

    if (errorCount > 0) {return { status: 'error', message: `${errorCount} critical issues detected` };}
    if (warningCount > 0) {return { status: 'warning', message: `${warningCount} warnings detected` };}

    return { status: 'healthy', message: 'All systems operational' };
  };

  const overallHealth = getOverallHealth();

  if (loading && !metrics) {
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
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Host Details</h4>
            <p className="text-sm">• Hostname: {metrics?.system.hostname}</p>
            <p className="text-sm">• Platform: {metrics?.system.platform} ({metrics?.system.arch})</p>
            <p className="text-sm">• Release: {metrics?.system.release}</p>
          </div>
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm">• Load Average: {(metrics?.system.loadAverage[0] || 0).toFixed(2)} (1m), {(metrics?.system.loadAverage[1] || 0).toFixed(2)} (5m), {(metrics?.system.loadAverage[2] || 0).toFixed(2)} (15m)</p>
            <p className="text-sm">• Memory Available: {formatBytes((metrics?.memory.total || 0) - (metrics?.memory.used || 0))}</p>
            <p className="text-sm">• System Uptime: {formatUptime(metrics?.uptime || 0)}</p>
          </div>
        </div>
      ),
    },
  ];

  const cpuUsage = (metrics?.cpu.user || 0) + (metrics?.cpu.system || 0);

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
                      className={`progress w-full ${cpuUsage > 80 ? 'progress-error' : cpuUsage > 60 ? 'progress-warning' : 'progress-success'}`}
                      value={cpuUsage}
                      max="100"
                    ></progress>
                  </div>
                  <span className="text-sm">
                    {cpuUsage.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  User: {metrics?.cpu.user.toFixed(1)}% • System: {metrics?.cpu.system.toFixed(1)}%
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

          {/* Load Average */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-5 h-5 mr-2" />
                  <span className="font-medium">Load Average</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {metrics?.system.loadAverage.map((load, index) => (
                    <Badge
                      key={index}
                      variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'success'}
                      size="lg"
                    >
                      {`${index === 0 ? '1m' : index === 1 ? '5m' : '15m'}: ${load.toFixed(2)}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <h3 className="text-lg font-bold mb-4">
          Health Checks
        </h3>

        {healthChecks.length === 0 ? (
          <div className="text-center py-4 text-base-content/50">
            No health checks configured.
          </div>
        ) : (
          <ul className="menu bg-base-200 w-full rounded-box mb-6">
            {healthChecks.map((check, index) => (
              <React.Fragment key={check.id}>
                <li>
                  <div className="flex items-center justify-between py-3 cursor-default hover:bg-transparent">
                    <div className="flex items-center gap-3 w-full">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
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
                        {check.details && (
                          <div className="text-xs text-base-content/50 mt-1">
                            {check.details}
                          </div>
                        )}
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
        )}

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;