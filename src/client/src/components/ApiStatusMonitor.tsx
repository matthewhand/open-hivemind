import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Badge,
  Alert,
  Accordion,
  Divider,
  Button,
  Tooltip,
} from './DaisyUI';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';

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
  refreshInterval = 30000,
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

    newSocket.on('api_status_update', (data: { endpoints: EndpointStatus[]; overall: any; timestamp: string }) => {
      setApiStatus(data);
      setLastRefresh(new Date());
    });

    newSocket.on('api_health_check_result', (data: { result: any; timestamp: string }) => {
      // Update specific endpoint status
      if (apiStatus) {
        const updatedEndpoints = apiStatus.endpoints.map(endpoint => {
          if (endpoint.id === data.result.endpointId) {
            return {
              ...endpoint,
              status: (data.result.success ? (endpoint.responseTime > 5000 ? 'slow' : 'online') : 'error') as EndpointStatus['status'],
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
    const className = 'w-5 h-5';
    switch (status) {
    case 'online':
      return <CheckCircleIcon className={`${className} text-success`} />;
    case 'slow':
      return <ExclamationTriangleIcon className={`${className} text-warning`} />;
    case 'offline':
    case 'error':
      return <ExclamationCircleIcon className={`${className} text-error`} />;
    default:
      return <InformationCircleIcon className={`${className} text-info`} />;
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
      return 'ghost';
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) {return `${ms.toFixed(0)}ms`;}
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatUptime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {return `${hours}h ${minutes % 60}m ago`;}
    if (minutes > 0) {return `${minutes}m ago`;}
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
      <Card>
        <Card.Body>
          <div className="flex justify-center items-center py-8">
            <p className="ml-2 text-base-content/70">
              Loading API status...
            </p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (!apiStatus) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="error">
            Failed to load API status data
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  const accordionItems = [
    {
      id: 'monitoring-details',
      title: 'Monitoring Details',
      icon: '📊',
      content: (
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[300px] flex-1">
            <h4 className="font-medium mb-2">
              Performance Metrics
            </h4>
            <p className="text-sm">
              • Average Response Time: {formatResponseTime(
                apiStatus.endpoints.reduce((sum, ep) => sum + ep.averageResponseTime, 0) / apiStatus.endpoints.length || 0,
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
            <h4 className="font-medium mb-2">
              Monitoring Status
            </h4>
            <p className="text-sm">
              • Monitoring Active: {monitoringActive ? 'Yes' : 'No'}
            </p>
            <p className="text-sm">
              • Last Update: {new Date(apiStatus.timestamp).toLocaleString()}
            </p>
            <p className="text-sm">
              • WebSocket Connected: {socket?.connected ? 'Yes' : 'No'}
            </p>
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
            API Status Monitor
          </Card.Title>
          <div className="flex items-center gap-3">
            <Tooltip content="Refresh">
              <Button onClick={handleRefresh} size="sm" variant="ghost">
                <ArrowPathIcon className="w-5 h-5" />
              </Button>
            </Tooltip>
            <Button
              onClick={monitoringActive ? handleStopMonitoring : handleStartMonitoring}
              variant="secondary" className="btn-outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {monitoringActive ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
              {monitoringActive ? 'Stop' : 'Start'} Monitoring
            </Button>
            {lastRefresh && (
              <span className="text-sm text-base-content/70">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Overall Status */}
        <Alert
          variant={apiStatus.overall.status === 'healthy' ? 'success' : apiStatus.overall.status === 'warning' ? 'warning' : 'error'}
          className="mb-6"
        >
          {apiStatus.overall.message}
        </Alert>

        {/* Status Summary */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Badge variant="neutral" className="badge-outline" size="lg">
            Total: {apiStatus.overall.stats.total}
          </Badge>
          <Badge variant="success" size="lg">
            Online: {apiStatus.overall.stats.online}
          </Badge>
          <Badge variant="warning" size="lg">
            Slow: {apiStatus.overall.stats.slow}
          </Badge>
          <Badge variant="error" size="lg">
            Offline: {apiStatus.overall.stats.offline}
          </Badge>
          <Badge variant="error" size="lg">
            Errors: {apiStatus.overall.stats.error}
          </Badge>
        </div>

        {/* Endpoint List */}
        <h3 className="text-lg font-bold mb-4">
          Monitored Endpoints
        </h3>

        <ul className="menu bg-base-200 w-full rounded-box mb-6">
          {apiStatus.endpoints.map((endpoint, index) => (
            <React.Fragment key={endpoint.id}>
              <li>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(endpoint.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{endpoint.name}</span>
                        <Badge
                          variant={getStatusColor(endpoint.status) as any}
                          size="sm"
                        >
                          {endpoint.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-base-content/70 mt-1">
                        {endpoint.url}
                      </div>
                      <div className="text-xs text-base-content/50 mt-1">
                        Response: {formatResponseTime(endpoint.responseTime)} |
                        Last checked: {formatUptime(endpoint.lastChecked)} |
                        Success rate: {endpoint.totalChecks > 0 ? Math.round((endpoint.successfulChecks / endpoint.totalChecks) * 100) : 0}%
                      </div>
                      {endpoint.errorMessage && (
                        <div className="text-xs text-error mt-1">
                          Error: {endpoint.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
              {index < apiStatus.endpoints.length - 1 && <Divider className="my-0" />}
            </React.Fragment>
          ))}
        </ul>

        {apiStatus.endpoints.length === 0 && (
          <div className="text-center py-8">
            <SignalIcon className="w-12 h-12 mx-auto text-base-content/50 mb-4" />
            <p className="text-base-content/70 mb-2">
              No API endpoints configured for monitoring
            </p>
            <p className="text-sm text-base-content/50">
              Add endpoints to start monitoring their status
            </p>
          </div>
        )}

        {/* Detailed Information */}
        <Accordion items={accordionItems} className="mt-4" />
      </Card.Body>
    </Card>
  );
};

export default ApiStatusMonitor;