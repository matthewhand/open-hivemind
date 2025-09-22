import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
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
    switch (status) {
      case 'online':
        return <CheckCircleIcon color="success" />;
      case 'slow':
        return <WarningIcon color="warning" />;
      case 'offline':
        return <ErrorIcon color="error" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
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
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading API status...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!apiStatus) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load API status data
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            API Status Monitor
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              startIcon={monitoringActive ? <StopIcon /> : <PlayIcon />}
              onClick={monitoringActive ? handleStopMonitoring : handleStartMonitoring}
              variant="outlined"
              size="small"
            >
              {monitoringActive ? 'Stop' : 'Start'} Monitoring
            </Button>
            {lastRefresh && (
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Overall Status */}
        <Alert
          severity={apiStatus.overall.status === 'healthy' ? 'success' : apiStatus.overall.status === 'warning' ? 'warning' : 'error'}
          sx={{ mb: 3 }}
        >
          {apiStatus.overall.message}
        </Alert>

        {/* Status Summary */}
        <Box display="flex" gap={2} mb={3}>
          <Chip
            label={`Total: ${apiStatus.overall.stats.total}`}
            variant="outlined"
            size="small"
          />
          <Chip
            label={`Online: ${apiStatus.overall.stats.online}`}
            color="success"
            size="small"
          />
          <Chip
            label={`Slow: ${apiStatus.overall.stats.slow}`}
            color="warning"
            size="small"
          />
          <Chip
            label={`Offline: ${apiStatus.overall.stats.offline}`}
            color="error"
            size="small"
          />
          <Chip
            label={`Errors: ${apiStatus.overall.stats.error}`}
            color="error"
            size="small"
          />
        </Box>

        {/* Endpoint List */}
        <Typography variant="h6" gutterBottom>
          Monitored Endpoints
        </Typography>

        <List>
          {apiStatus.endpoints.map((endpoint, index) => (
            <React.Fragment key={endpoint.id}>
              <ListItem>
                <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                  {getStatusIcon(endpoint.status)}
                </Box>

                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {endpoint.name}
                      </Typography>
                      <Chip
                        label={endpoint.status}
                        size="small"
                        color={getStatusColor(endpoint.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {endpoint.url}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Response: {formatResponseTime(endpoint.responseTime)} |
                        Last checked: {formatUptime(endpoint.lastChecked)} |
                        Success rate: {endpoint.totalChecks > 0 ? Math.round((endpoint.successfulChecks / endpoint.totalChecks) * 100) : 0}%
                      </Typography>
                      {endpoint.errorMessage && (
                        <Typography variant="caption" color="error" display="block">
                          Error: {endpoint.errorMessage}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>

              {index < apiStatus.endpoints.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {apiStatus.endpoints.length === 0 && (
          <Box textAlign="center" py={4}>
            <NetworkIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No API endpoints configured for monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add endpoints to start monitoring their status
            </Typography>
          </Box>
        )}

        {/* Detailed Information */}
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Monitoring Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Metrics
                </Typography>
                <Typography variant="body2">
                  • Average Response Time: {formatResponseTime(
                    apiStatus.endpoints.reduce((sum, ep) => sum + ep.averageResponseTime, 0) / apiStatus.endpoints.length || 0
                  )}
                </Typography>
                <Typography variant="body2">
                  • Total Checks: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0)}
                </Typography>
                <Typography variant="body2">
                  • Successful Checks: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.successfulChecks, 0)}
                </Typography>
                <Typography variant="body2">
                  • Overall Success Rate: {apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0) > 0 ?
                    Math.round((apiStatus.endpoints.reduce((sum, ep) => sum + ep.successfulChecks, 0) /
                    apiStatus.endpoints.reduce((sum, ep) => sum + ep.totalChecks, 0)) * 100) : 0}%
                </Typography>
              </Box>
              <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Monitoring Status
                </Typography>
                <Typography variant="body2">
                  • Monitoring Active: {monitoringActive ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2">
                  • Last Update: {new Date(apiStatus.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  • WebSocket Connected: {socket?.connected ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ApiStatusMonitor;