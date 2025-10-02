import React, { useState, useEffect, useCallback } from 'react';
import { Button as DaisyButton } from './DaisyUI';
import { apiService } from '../services/api';
import io, { Socket } from 'socket.io-client';

interface EndpointStatus {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'slow' | 'error';
  responseTime: number;
  lastChecked: string;
  lastSuccessfulCheck?: string;
  consecutiveFailures: number;
  totalChecks: number;
  successfulChecks: number;
  averageResponseTime: number;
  errorMessage?: string;
  statusCode?: number;
}

interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  timestamp: string;
  errorMessage?: string;
  statusCode?: number;
  endpointId: string;
}

interface ApiStatusData {
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
  endpoints: EndpointStatus[];
  timestamp: string;
}

interface ApiStatusMonitorProps {
  refreshInterval?: number;
}

const ApiStatusMonitor: React.FC<ApiStatusMonitorProps> = ({
  refreshInterval = 30000
}) => {
  const [apiStatus, setApiStatus] = useState<ApiStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);

  const fetchApiStatus = useCallback(async () => {
    try {
      const data = await apiService.getApiEndpointsStatus();
      setApiStatus(data);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch API status:', error);
      setLoading(false);
    }
  }, []);

  const setupWebSocket = useCallback(() => {
    const newSocket = io({
      path: '/webui/socket.io',
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket for API monitoring');
    });

    newSocket.on('api_status_update', (data: { endpoints: EndpointStatus[]; overall: ApiStatusData['overall']; timestamp: string }) => {
      setApiStatus(data);
      setLastRefresh(new Date());
    });

    newSocket.on('api_health_check_result', (data: { result: HealthCheckResult; timestamp: string }) => {
      // Update specific endpoint status
      if (apiStatus) {
        const updatedEndpoints = apiStatus.endpoints.map(endpoint => {
          if (endpoint.id === data.result.endpointId) {
            return {
              ...endpoint,
              status: (data.result.success ? (data.result.responseTime > 5000 ? 'slow' : 'online') : 'error') as EndpointStatus['status'],
              responseTime: data.result.responseTime,
              lastChecked: data.result.timestamp,
              errorMessage: data.result.errorMessage,
              statusCode: data.result.statusCode,
            };
          }
          return endpoint;
        });
        setApiStatus({
          ...apiStatus,
          endpoints: updatedEndpoints,
          timestamp: data.timestamp,
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [apiStatus]);

  useEffect(() => {
    fetchApiStatus();
    setupWebSocket();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchApiStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchApiStatus, setupWebSocket, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '✓';
      case 'slow':
        return '!';
      case 'offline':
      case 'error':
        return '✗';
      default:
        return 'i';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'slow':
        return 'warning';
      case 'offline':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatUptime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const handleStartMonitoring = async () => {
    try {
      await apiService.startApiMonitoring();
      setMonitoringActive(true);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await apiService.stopApiMonitoring();
      setMonitoringActive(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const handleRefresh = () => {
    fetchApiStatus();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex justify-center items-center py-4">
            <p className="ml-2">Loading API status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!apiStatus) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-error">
            <span>Failed to load API status data</span>
          </div>
        </div>
      </div>
    );
  }

  const alertClass = apiStatus.overall.status === 'healthy' ? 'alert-success' : apiStatus.overall.status === 'warning' ? 'alert-warning' : 'alert-error';

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex justify-between items-center mb-3">
          <h6 className="card-title">API Status Monitor</h6>
          <div className="flex gap-1 items-center">
            <div className="tooltip" data-tip="Refresh">
              <DaisyButton onClick={handleRefresh} size="sm" variant="ghost">
                ↻
              </DaisyButton>
            </div>
            <button
              className={`btn btn-outline btn-sm ${monitoringActive ? '' : ''}`}
              onClick={monitoringActive ? handleStopMonitoring : handleStartMonitoring}
            >
              {monitoringActive ? '⏹️' : '▶️'} {monitoringActive ? 'Stop' : 'Start'} Monitoring
            </button>
            {lastRefresh && (
              <p className="text-sm text-base-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Overall Status */}
        <div className={`alert ${alertClass} mb-3`}>
          <span>{apiStatus.overall.message}</span>
        </div>

        {/* Status Summary */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="badge badge-outline badge-sm">Total: {apiStatus.overall.stats.total}</div>
          <div className="badge badge-success badge-sm">Online: {apiStatus.overall.stats.online}</div>
          <div className="badge badge-warning badge-sm">Slow: {apiStatus.overall.stats.slow}</div>
          <div className="badge badge-error badge-sm">Offline: {apiStatus.overall.stats.offline}</div>
          <div className="badge badge-error badge-sm">Errors: {apiStatus.overall.stats.error}</div>
        </div>

        {/* Endpoint List */}
        <h6 className="mb-2">Monitored Endpoints</h6>

        <ul className="menu bg-base-100 w-full">
          {apiStatus.endpoints.map((endpoint, index) => (
            <React.Fragment key={endpoint.id}>
              <li>
                <div className="flex items-center">
                  <span className="mr-2 text-lg">{getStatusIcon(endpoint.status)}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{endpoint.name}</span>
                    <div className={`badge badge-${getStatusColor(endpoint.status)} badge-sm`}>{endpoint.status}</div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-base-600">{endpoint.url}</p>
                  <p className="text-xs text-base-500">
                    Response: {formatResponseTime(endpoint.responseTime)} | Last checked: {formatUptime(endpoint.lastChecked)} | Success rate: {endpoint.totalChecks > 0 ? Math.round((endpoint.successfulChecks / endpoint.totalChecks) * 100) : 0}%
                  </p>
                  {endpoint.errorMessage && (
                    <p className="text-xs text-error mt-1">Error: {endpoint.errorMessage}</p>
                  )}
                </div>
              </li>
              {index < apiStatus.endpoints.length - 1 && <div className="divider"></div>}
            </React.Fragment>
          ))}
        </ul>

        {apiStatus.endpoints.length === 0 && (
          <div className="text-center py-4">
            <span className="text-4xl text-base-500 mb-2 block">🌐</span>
            <p className="text-base-500">No API endpoints configured for monitoring</p>
            <p className="text-sm text-base-500">Add endpoints to start monitoring their status</p>
          </div>
        )}

        {/* Detailed Information */}
        <div className="collapse mt-2">
          <input type="checkbox" />
          <div className="collapse-title">
            <span>Monitoring Details</span>
            <span className="ml-auto">▼</span>
          </div>
          <div className="collapse-content">
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[300px] flex-1">
                <h6 className="mb-2">Performance Metrics</h6>
                <p className="text-sm">
                  • Average Response Time: {formatResponseTime(
                    apiStatus.endpoints.reduce((sum, ep) => sum + ep.averageResponseTime, 0) / apiStatus.endpoints.length || 0
                  )}
                </p>
                <p className="text-sm">
                  • Total Checks: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0)}
                </p>
                <p className="text-sm">
                  • Successful Checks: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.successfulChecks, 0)}
                </p>
                <p className="text-sm">
                  • Overall Success Rate: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0) > 0 ?
                    Math.round((apiStatus.endpoints.reduce((sum, ep) => sum + ep.successfulChecks, 0) /
                    apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0)) * 100) : 0}%
                </p>
              </div>
              <div className="min-w-[300px] flex-1">
                <h6 className="mb-2">Monitoring Status</h6>
                <p className="text-sm">• Monitoring Active: {monitoringActive ? 'Yes' : 'No'}</p>
                <p className="text-sm">• Last Update: {new Date(apiStatus.timestamp).toLocaleString()}</p>
                <p className="text-sm">• WebSocket Connected: {socket?.connected ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiStatusMonitor;