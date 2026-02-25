/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Alert,
  Accordion,
  Divider,
} from './DaisyUI';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Cpu,
  Server,
  Activity,
  HardDrive
} from 'lucide-react';
import { apiService } from '../services/api';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number; // Derived from load average or passed directly if available
    cores: number; // Not in API, maybe default
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
  system: {
      platform: string;
      arch: string;
      hostname: string;
  };
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const data = await apiService.getSystemHealth();

        // Map API response to component state
        // Note: Some fields are mocked because the API might not return them yet
        const mappedMetrics: SystemMetrics = {
            cpu: {
                usage: (data.cpu.user + data.cpu.system) / 100, // Rough estimate
                cores: 4, // Mock
            },
            memory: {
                used: data.memory.used,
                total: data.memory.total,
                usage: data.memory.usage,
            },
            disk: {
                used: 0, // Not provided
                total: 0, // Not provided
                usage: 0, // Not provided
            },
            network: {
                latency: 0, // Not provided
                status: 'online', // Assume online if we got response
            },
            uptime: data.uptime,
            loadAverage: data.system.loadAverage,
            system: {
                platform: data.system.platform,
                arch: data.system.arch,
                hostname: data.system.hostname
            }
        };

        setMetrics(mappedMetrics);

        // Mock health checks for now as there is no specific endpoint for granular checks list
        // In a real app, this would come from a specific endpoint
        const mockHealthChecks: HealthCheck[] = [
            {
              id: '1',
              name: 'System Status',
              status: data.status === 'healthy' ? 'healthy' : 'error',
              message: `System is ${data.status}`,
              lastChecked: new Date().toISOString(),
            },
             {
              id: '2',
              name: 'Memory Usage',
              status: data.memory.usage > 90 ? 'error' : data.memory.usage > 75 ? 'warning' : 'healthy',
              message: `Memory usage at ${data.memory.usage.toFixed(1)}%`,
              lastChecked: new Date().toISOString(),
            }
        ];

        setHealthChecks(mockHealthChecks);
        setLastRefresh(new Date());
        setError(null);
      } catch (err) {
          console.error('Failed to fetch system health:', err);
          setError('Failed to fetch system health data');
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
      return <XCircle className={`${className} text-error`} />;
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

    if (days > 0) { return `${days}d ${hours}h ${minutes}m`; }
    if (hours > 0) { return `${hours}h ${minutes}m`; }
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
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
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;

    if (errorCount > 0) { return { status: 'error', message: `${errorCount} critical issues detected` }; }
    if (warningCount > 0) { return { status: 'warning', message: `${warningCount} warnings detected` }; }
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

  if (error) {
      return (
          <Alert status="error" message={error} />
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
            <p className="text-sm">• Hostname: {metrics?.system.hostname || 'Unknown'}</p>
            <p className="text-sm">• Platform: {metrics?.system.platform} ({metrics?.system.arch})</p>
          </div>
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm">• CPU Load: {(metrics?.loadAverage[0] || 0).toFixed(2)} (1m), {(metrics?.loadAverage[1] || 0).toFixed(2)} (5m), {(metrics?.loadAverage[2] || 0).toFixed(2)} (15m)</p>
            <p className="text-sm">• Memory Available: {formatBytes((metrics?.memory.total || 0) - (metrics?.memory.used || 0))}</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">System Health Monitor</h2>
          {lastRefresh && (
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
      </div>

        {/* Overall Health Status */}
        <Alert
            status={overallHealth.status === 'healthy' ? 'success' : overallHealth.status === 'warning' ? 'warning' : 'error'}
            message={overallHealth.message}
            icon={getStatusIcon(overallHealth.status)}
        />

        {/* System Metrics */}
        <h3 className="text-lg font-bold">
          System Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CPU Usage */}
          <Card className="bg-base-100 border border-base-200">
              <Card.Body className="p-4">
                <div className="flex items-center mb-2">
                  <Cpu className="w-5 h-5 mr-2" />
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
              </Card.Body>
          </Card>

          {/* Memory Usage */}
          <Card className="bg-base-100 border border-base-200">
              <Card.Body className="p-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-5 h-5 mr-2" />
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
              </Card.Body>
          </Card>

           {/* Uptime */}
          <Card className="bg-base-100 border border-base-200">
              <Card.Body className="p-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-5 h-5 mr-2" />
                  <span className="font-medium">System Uptime</span>
                </div>
                <div className="text-2xl font-mono">
                    {formatUptime(metrics?.uptime || 0)}
                </div>
              </Card.Body>
          </Card>
        </div>

        {/* Load Average */}
        <div>
            <h3 className="text-lg font-bold mb-4">
            Load Average
            </h3>
            <div className="flex gap-2">
            {metrics?.loadAverage.map((load, index) => (
                <Badge
                key={index}
                variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'success' as any}
                size="lg"
                >
                {`${index === 0 ? '1m' : index === 1 ? '5m' : '15m'}: ${load.toFixed(2)}`}
                </Badge>
            ))}
            </div>
        </div>

        {/* Health Checks */}
        <div>
            <h3 className="text-lg font-bold mb-4">
            Health Checks
            </h3>

            <div className="bg-base-200 rounded-box">
            {healthChecks.map((check, index) => (
                <React.Fragment key={check.id}>
                <div className="p-4 flex items-center justify-between">
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
                        </div>
                    </div>
                     <div className="text-xs text-base-content/50">
                        {new Date(check.lastChecked).toLocaleTimeString()}
                    </div>
                </div>
                {index < healthChecks.length - 1 && <Divider className="my-0" />}
                </React.Fragment>
            ))}
            </div>
        </div>

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
    </div>
  );
};

export default SystemHealth;
