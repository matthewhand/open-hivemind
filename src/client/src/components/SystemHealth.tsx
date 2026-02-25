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
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info
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
  platform?: string;
  arch?: string;
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

        // Map API data to component state
        const systemMetrics: SystemMetrics = {
          cpu: {
            usage: (data.cpu?.user || 0) + (data.cpu?.system || 0), // Basic approximation if percentage
            cores: 0, // Not available in current API
            temperature: undefined,
          },
          memory: {
            used: data.memory.used,
            total: data.memory.total,
            usage: data.memory.usage,
          },
          disk: {
            used: 0, // Not available
            total: 0,
            usage: 0,
          },
          network: {
            latency: 0, // Not available
            status: 'online', // Assumed if we got data
          },
          uptime: data.uptime,
          loadAverage: data.system.loadAverage || [],
          platform: data.system.platform,
          arch: data.system.arch,
        };

        // Generate health checks based on real data
        const newHealthChecks: HealthCheck[] = [
          {
            id: 'memory',
            name: 'Memory Usage',
            status: data.memory.usage > 90 ? 'error' : data.memory.usage > 75 ? 'warning' : 'healthy',
            message: `Memory usage is at ${data.memory.usage.toFixed(1)}%`,
            lastChecked: new Date().toISOString(),
          },
          {
            id: 'system',
            name: 'System Load',
            status: (data.system.loadAverage?.[0] || 0) > 4 ? 'warning' : 'healthy',
            message: `1m Load Average: ${(data.system.loadAverage?.[0] || 0).toFixed(2)}`,
            lastChecked: new Date().toISOString(),
          },
          {
            id: 'api',
            name: 'API Status',
            status: 'healthy',
            message: 'API is responding',
            lastChecked: new Date().toISOString(),
          }
        ];

        setMetrics(systemMetrics);
        setHealthChecks(newHealthChecks);
        setLastRefresh(new Date());
        setError(null);
      } catch (err) {
        console.error('Failed to fetch system health:', err);
        setError('Failed to load system health data');

        // Fallback to minimal data to not break UI completely
        if (!metrics) {
            setHealthChecks([{
                id: 'error',
                name: 'System Monitor',
                status: 'error',
                message: 'Failed to connect to monitoring service',
                lastChecked: new Date().toISOString()
            }]);
        }
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

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'ghost' => {
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

    if (errorCount > 0) {return { status: 'error', message: `${errorCount} critical issues detected` };}
    if (warningCount > 0) {return { status: 'warning', message: `${warningCount} warnings detected` };}
    return { status: 'healthy', message: 'All systems operational' };
  };

  const overallHealth = getOverallHealth();
  const alertStatus = overallHealth.status === 'healthy' ? 'success' : overallHealth.status === 'warning' ? 'warning' : 'error';

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

  if (error && !metrics) {
    return (
      <Alert variant="error" icon={<AlertTriangle className="w-5 h-5"/>} message={error} />
    );
  }

  const accordionItems = [
    {
      id: 'system-info',
      title: 'System Information',
      icon: <Info className="w-5 h-5"/>,
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Host Details</h4>
            <p className="text-sm">• Platform: {metrics?.platform || 'Unknown'}</p>
            <p className="text-sm">• Architecture: {metrics?.arch || 'Unknown'}</p>
            <p className="text-sm">• System Uptime: {formatUptime(metrics?.uptime || 0)}</p>
          </div>
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">Performance Metrics</h4>
            <p className="text-sm">• Load Average (1m): {(metrics?.loadAverage?.[0] || 0).toFixed(2)}</p>
            <p className="text-sm">• Load Average (5m): {(metrics?.loadAverage?.[1] || 0).toFixed(2)}</p>
            <p className="text-sm">• Load Average (15m): {(metrics?.loadAverage?.[2] || 0).toFixed(2)}</p>
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
            variant={alertStatus}
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
          {/* CPU Usage (Load) */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Cpu className="w-5 h-5 mr-2" />
                  <span className="font-medium">CPU Load</span>
                </div>
                {/* We use load average as proxy for CPU usage bar since raw percentage isn't always available */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <progress
                      className={`progress w-full ${(metrics?.loadAverage?.[0] || 0) > 4 ? 'progress-warning' : 'progress-success'}`}
                      value={(metrics?.loadAverage?.[0] || 0) * 20} // Rough scale: load 5 = 100%
                      max="100"
                    ></progress>
                  </div>
                  <span className="text-sm">
                    {(metrics?.loadAverage?.[0] || 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  1 min average load
                </span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="min-w-[300px] flex-1">
            <div className="card card-bordered border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center mb-2">
                  <Activity className="w-5 h-5 mr-2" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <progress
                      className={`progress w-full ${(metrics?.memory.usage || 0) > 90 ? 'progress-error' : (metrics?.memory.usage || 0) > 75 ? 'progress-warning' : 'progress-success'}`}
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
        </div>

        {/* Load Average Badges */}
        <h3 className="text-lg font-bold mb-4">
          Load Average History
        </h3>
        <div className="flex gap-2 mb-6">
          {metrics?.loadAverage?.map((load, index) => (
            <Badge
              key={index}
              variant={load > 4 ? 'warning' : 'neutral'}
              size="lg"
            >
              {`${index === 0 ? '1m' : index === 1 ? '5m' : '15m'}: ${load.toFixed(2)}`}
            </Badge>
          ))}
        </div>

        {/* Health Checks List */}
        <h3 className="text-lg font-bold mb-4">
          Component Status
        </h3>

        <ul className="menu bg-base-200 w-full rounded-box mb-6">
          {healthChecks.map((check, index) => (
            <React.Fragment key={check.id}>
              <li>
                <div className="flex items-center justify-between py-3 cursor-default hover:bg-base-200">
                  <div className="flex items-center gap-3 w-full">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 justify-between w-full">
                        <span className="font-medium">{check.name}</span>
                        <Badge
                          variant={getStatusColor(check.status)}
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
                </div>
              </li>
              {index < healthChecks.length - 1 && <Divider className="my-0" />}
            </React.Fragment>
          ))}
        </ul>

        {/* Detailed Information Accordion */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;
