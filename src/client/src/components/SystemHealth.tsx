/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Loading,
  Badge,
  Alert,
  Accordion,
  Divider,
  Progress,
} from './DaisyUI';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Bolt,
  Cpu,
  Server,
  Signal,
  ChevronDown,
  Activity,
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

const SystemHealth: React.FC<SystemHealthProps> = ({
  refreshInterval = 30000,
}) => {
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
      } catch (err: any) {
        console.error('Failed to fetch system health:', err);
        setError('Failed to fetch system health data');
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
      <Alert status="error" message={error} />
    );
  }

  const accordionItems = [
    {
      id: 'system-info',
      title: 'Detailed System Information',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 text-sm uppercase tracking-wider opacity-70">OS Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between border-b border-base-200 py-1">
                <span>Platform:</span>
                <span className="font-mono">{metrics?.system?.platform}</span>
              </div>
              <div className="flex justify-between border-b border-base-200 py-1">
                <span>Architecture:</span>
                <span className="font-mono">{metrics?.system?.arch}</span>
              </div>
              <div className="flex justify-between border-b border-base-200 py-1">
                <span>Release:</span>
                <span className="font-mono">{metrics?.system?.release}</span>
              </div>
              <div className="flex justify-between border-b border-base-200 py-1">
                <span>Hostname:</span>
                <span className="font-mono">{metrics?.system?.hostname}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-sm uppercase tracking-wider opacity-70">Process</h4>
            <div className="space-y-1 text-sm">
               <div className="flex justify-between border-b border-base-200 py-1">
                <span>Uptime:</span>
                <span className="font-mono">{formatUptime(metrics?.uptime || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-base-200 py-1">
                <span>Status:</span>
                <Badge size="sm" variant={getStatusColor(metrics?.status || 'unknown') as any}>{metrics?.status}</Badge>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card className="shadow-sm border border-base-200">
      <Card.Body>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="card-title text-xl">Infrastructure Health</h2>
          </div>
          {lastRefresh && (
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Overall Health Status from API Health if available, else System Status */}
        {apiHealth && (
          <div className="mb-6">
            <Alert
              status={apiHealth.overall.status}
              message={apiHealth.overall.message || `System Status: ${metrics?.status}`}
            />
          </div>
        )}

        {/* System Metrics */}
        <h3 className="text-lg font-bold mb-4 mt-2 flex items-center gap-2">
           <Cpu className="w-5 h-5" /> Resources
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Memory Usage */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-center mb-2">
                <Bolt className="w-5 h-5 mr-2 text-warning" />
                <span className="font-medium">Memory Usage</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress
                    value={metrics?.memory?.usage || 0}
                    max={100}
                    variant={(metrics?.memory?.usage || 0) > 90 ? 'error' : (metrics?.memory?.usage || 0) > 70 ? 'warning' : 'success'}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">
                  {(metrics?.memory?.usage || 0).toFixed(0)}%
                </span>
              </div>
              <span className="text-xs text-base-content/70 mt-1">
                {formatBytes((metrics?.memory?.used || 0) * 1024 * 1024)} / {formatBytes((metrics?.memory?.total || 0) * 1024 * 1024)}
              </span>
            </div>
          </div>

          {/* Load Average */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-center mb-2">
                <Cpu className="w-5 h-5 mr-2 text-primary" />
                <span className="font-medium">Load Average</span>
              </div>
              <div className="flex gap-2 justify-between items-center h-full">
                {metrics?.system?.loadAverage || [].map((load, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <span className="text-xs opacity-70">{index === 0 ? '1m' : index === 1 ? '5m' : '15m'}</span>
                    <Badge
                      variant={load > 2 ? 'error' : load > 1 ? 'warning' : 'neutral'}
                      size="lg"
                    >
                      {load.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Network Status (if available) */}
          <div className="card bg-base-100 border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-center mb-2">
                <Signal className="w-5 h-5 mr-2 text-info" />
                <span className="font-medium">API Network Status</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <Badge
                  variant={getStatusColor(apiHealth?.overall.status || 'unknown') as any}
                  size="lg"
                >
                  {apiHealth?.overall.status || 'Unknown'}
                </Badge>
                {apiHealth && (
                  <span className="text-sm">
                    {apiHealth.overall.stats.online} / {apiHealth.overall.stats.total} Online
                  </span>
                )}
              </div>
              <span className="text-xs text-base-content/70 mt-1">
                 Latency check on endpoints
              </span>
            </div>
          </div>
        </div>

        {/* Health Checks List */}
        {apiHealth?.endpoints && apiHealth.endpoints.length > 0 && (
          <>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Endpoint Checks
            </h3>
            <ul className="menu bg-base-100 border border-base-200 w-full rounded-box mb-6 p-0">
              {apiHealth.endpoints.map((check, index) => (
                <React.Fragment key={check.id}>
                  <li>
                    <div className="flex items-center justify-between py-3 hover:bg-base-200 cursor-default">
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
                          {check.errorMessage && (
                            <div className="text-sm text-error mt-1">
                              {check.errorMessage}
                            </div>
                          )}
                          <div className="text-xs text-base-content/50 mt-1">
                            Response: {formatLatency(check.responseTime)} • Checked: {new Date(check.lastChecked).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-mono opacity-50">
                        {check.url}
                      </div>
                    </div>
                  </li>
                  {index < apiHealth.endpoints.length - 1 && <Divider className="my-0" />}
                </React.Fragment>
              ))}
            </ul>
          </>
        )}

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default SystemHealth;
