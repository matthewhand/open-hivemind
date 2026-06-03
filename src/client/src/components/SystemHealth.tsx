/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import Card from './DaisyUI/Card';
import { SkeletonList } from './DaisyUI/Skeleton';
import Badge from './DaisyUI/Badge';
import { Alert } from './DaisyUI/Alert';
import Collapse from './DaisyUI/Collapse';
import Indicator from './DaisyUI/Indicator';
import Stack from './DaisyUI/Stack';
import { Progress } from './DaisyUI/Loading';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Bolt,
  Cpu,
  Signal,
  Activity,
  Globe,
} from 'lucide-react';
import { apiService } from '../services/api';

interface SystemHealthProps {
  refreshInterval?: number;
}

interface SystemHealthData {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  system: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    loadAverage: number[];
  };
}

interface ApiHealthData {
  overall: {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    stats: {
      total: number;
      online: number;
      slow: number;
      offline: number;
      error: number;
    };
  };
  endpoints: Array<{
    id: string;
    name: string;
    url: string;
    status: 'online' | 'offline' | 'slow' | 'error';
    responseTime: number;
    lastChecked: string;
    errorMessage?: string;
  }>;
}

const SystemHealth: React.FC<SystemHealthProps> = ({ refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState<SystemHealthData | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sysData, apiData] = await Promise.all([
          apiService.getSystemHealth(),
          apiService.getApiEndpointsStatus().catch(() => null), // Optional if API monitoring is not enabled
        ]);

        setMetrics(sysData);
        if (apiData) {
          setApiHealth(apiData);
        }
        setLastRefresh(new Date());
        setError(null);
      } catch (err: unknown) {
        // Provide more specific error messages based on error type
        if (
          (err instanceof Error ? err.name : 'Error') === 'TypeError' &&
          (err instanceof Error ? err.message : String(err)).includes('fetch')
        ) {
          setError('Network error: Unable to connect to server. Please check your connection.');
        } else if ((err as any).status === 401 || (err as any).status === 403) {
          setError('Authentication error: Please log in to view system health details.');
        } else if ((err as any).status >= 500) {
          setError('Server error: Health check service is temporarily unavailable.');
        } else {
          setError('Failed to fetch system health data. Some metrics may be unavailable.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
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

  if (loading && !metrics) {
    return (
      <Card>
        <Card.Body>
          <div className="py-6 px-4">
            <SkeletonList items={5} />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error && !metrics) {
    return <Alert status="error" message={error} />;
  }

  return (
    <Card className="shadow-sm border border-base-200">
      <Card.Body>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <Card.Title className="text-xl">Infrastructure Health</Card.Title>
          </div>
          {lastRefresh && (
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Overall Health Status */}
        {apiHealth && (
          <div className="mb-6">
            <Alert
              status={apiHealth?.overall?.status}
              message={apiHealth?.overall?.message || `System Status: ${metrics?.status}`}
            />
          </div>
        )}

        {/* System Metrics */}
        <h3 className="text-lg font-bold mb-4 mt-2 flex items-center gap-2">
          <Cpu className="w-5 h-5" /> Resources
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Memory Usage with Indicator */}
          <Indicator
            item={
              <Badge
                variant={
                  (metrics?.memory?.usage || 0) > 90
                    ? 'error'
                    : (metrics?.memory?.usage || 0) > 70
                      ? 'warning'
                      : 'success'
                }
                size="xs"
              />
            }
            className="w-full"
          >
            <Card className="border border-base-200 w-full">
              <Card.Body className="p-4">
                <div className="flex items-center mb-2">
                  <Bolt className="w-5 h-5 mr-2 text-warning" />
                  <span className="font-medium">Memory Usage</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress
                      value={metrics?.memory?.usage || 0}
                      max={100}
                      variant={
                        (metrics?.memory?.usage || 0) > 90
                          ? 'error'
                          : (metrics?.memory?.usage || 0) > 70
                            ? 'warning'
                            : 'success'
                      }
                    />
                  </div>
                  <span className="text-sm font-mono w-12 text-right">
                    {(metrics?.memory?.usage || 0).toFixed(0)}%
                  </span>
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  {formatBytes((metrics?.memory?.used || 0) * 1024 * 1024)} /{' '}
                  {formatBytes((metrics?.memory?.total || 0) * 1024 * 1024)}
                </span>
              </Card.Body>
            </Card>
          </Indicator>

          {/* Load Average */}
          <Card className="border border-base-200">
            <Card.Body className="p-4">
              <div className="flex items-center mb-2">
                <Cpu className="w-5 h-5 mr-2 text-primary" />
                <span className="font-medium">Load Average</span>
              </div>
              <div className="flex gap-2 justify-between items-center h-full pt-2">
                <Stack className="w-full">
                  {(metrics?.system?.loadAverage || []).map((load, index) => (
                    <div key={index} className="grid grid-cols-2 bg-base-100 border border-base-300 p-2 items-center rounded-lg shadow-sm">
                      <span className="text-xs font-bold opacity-60 px-2">{index === 0 ? '1m' : index === 1 ? '5m' : '15m'}</span>
                      <Badge
                        variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'neutral'}
                        size="md"
                        className="font-mono"
                      >
                        {load.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </Stack>
              </div>
            </Card.Body>
          </Card>

          {/* Network Status with Indicator */}
          <Indicator
            item={
              <Badge
                variant={getStatusColor(apiHealth?.overall?.status || 'unknown') as any}
                size="xs"
              />
            }
            className="w-full"
          >
            <Card className="border border-base-200 w-full">
              <Card.Body className="p-4">
                <div className="flex items-center mb-2">
                  <Signal className="w-5 h-5 mr-2 text-info" />
                  <span className="font-medium">API Network Status</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={getStatusColor(apiHealth?.overall?.status || 'unknown') as any}>
                    {apiHealth?.overall?.status || 'Unknown'}
                  </Badge>
                  {apiHealth?.overall?.stats && (
                    <span className="text-sm font-medium">
                      {apiHealth.overall.stats.online} / {apiHealth.overall.stats.total} Online
                    </span>
                  )}
                </div>
                <span className="text-xs text-base-content/70 mt-1">
                  Latency check on active endpoints
                </span>
              </Card.Body>
            </Card>
          </Indicator>
        </div>

        {/* Health Checks List */}
        {apiHealth?.endpoints && apiHealth.endpoints.length > 0 && (
          <>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" /> Endpoint Checks
            </h3>
            <div className="overflow-x-auto border border-base-200 rounded-box mb-6">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Response Time</th>
                    <th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {apiHealth.endpoints.map((check) => (
                    <tr key={check.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">{check.name}</span>
                          <span className="text-xs opacity-50 font-mono">{check.url}</span>
                          {check.errorMessage && (
                            <span className="text-xs text-error">{check.errorMessage}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <Badge variant={getStatusColor(check.status) as any} size="sm">
                            {check.status}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono">{formatLatency(check.responseTime)}</span>
                      </td>
                      <td>
                        <span className="text-xs">
                          {new Date(check.lastChecked).toLocaleTimeString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Detailed Information using Collapse */}
        <div className="mt-4">
          <Collapse
            title="Detailed System Information"
            icon={<Info className="w-5 h-5" />}
            variant="arrow"
            className="border border-base-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
              <div>
                <h4 className="font-bold mb-3 text-xs uppercase tracking-widest text-base-content/50">
                  OS Environment
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Platform</span>
                    <Badge variant="ghost" className="font-mono">
                      {metrics?.system?.platform ?? 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Architecture</span>
                    <Badge variant="ghost" className="font-mono">
                      {metrics?.system?.arch ?? 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Release</span>
                    <span className="font-mono text-xs">{metrics?.system?.release ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Hostname</span>
                    <span className="font-mono text-xs">{metrics?.system?.hostname ?? 'Unknown'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3 text-xs uppercase tracking-widest text-base-content/50">
                  Process Health
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Server Uptime</span>
                    <span className="font-medium">{formatUptime(metrics?.uptime || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Node Environment</span>
                    <Badge variant="primary" size="sm">
                      {process.env.NODE_ENV || 'production'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-70">Overall Status</span>
                    <Badge variant={getStatusColor(metrics?.status || 'unknown') as any}>
                      {metrics?.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Collapse>
        </div>
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;
