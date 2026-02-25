/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Alert,
  Accordion,
} from './DaisyUI';
import {
  Cpu,
  Zap,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Activity
} from 'lucide-react';
import { apiService } from '../services/api';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  uptime: number;
  loadAverage: number[];
  system: {
      platform: string;
      arch: string;
      release: string;
      hostname: string;
  };
}

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'online' | 'offline' | 'slow';
  message: string;
  lastChecked: string;
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
        const [healthData, apiStatus] = await Promise.all([
            apiService.getSystemHealth(),
            apiService.getApiEndpointsStatus()
        ]);

        const newMetrics: SystemMetrics = {
          cpu: {
            usage: healthData.cpu.user + healthData.cpu.system,
          },
          memory: healthData.memory,
          uptime: healthData.uptime,
          loadAverage: healthData.system.loadAverage,
          system: healthData.system
        };

        const checks: HealthCheck[] = apiStatus.endpoints.map(ep => ({
            id: ep.id,
            name: ep.name,
            status: ep.status,
            message: ep.errorMessage || (ep.status === 'online' ? 'Operational' : `Status: ${ep.status}`),
            lastChecked: ep.lastChecked
        }));

        setMetrics(newMetrics);
        setHealthChecks(checks);
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Failed to fetch system health:', err);
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
    const errorCount = healthChecks.filter(h => h.status === 'error' || h.status === 'offline').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning' || h.status === 'slow').length;

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
      title: 'Detailed System Information',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Host Information</h4>
            <p className="text-sm">• Hostname: {metrics?.system.hostname}</p>
            <p className="text-sm">• Platform: {metrics?.system.platform} ({metrics?.system.arch})</p>
            <p className="text-sm">• Release: {metrics?.system.release}</p>
          </div>
          <div className="min-w-[300px] flex-1">
             <h4 className="font-medium mb-2">Load Averages</h4>
            <p className="text-sm">• 1m: {(metrics?.loadAverage[0] || 0).toFixed(2)}</p>
            <p className="text-sm">• 5m: {(metrics?.loadAverage[1] || 0).toFixed(2)}</p>
            <p className="text-sm">• 15m: {(metrics?.loadAverage[2] || 0).toFixed(2)}</p>
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

           {/* Uptime */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-5 h-5 mr-2" />
                  <span className="font-medium">Uptime</span>
                </div>
                 <div className="text-2xl font-mono">
                    {formatUptime(metrics?.uptime || 0)}
                 </div>
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
                <li key={check.id} className={index < healthChecks.length - 1 ? 'border-b border-base-300' : ''}>
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
            ))}
            </ul>
        ) : (
            <div className="text-center py-4 text-base-content/50">
                No health checks configured.
            </div>
        )}

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;