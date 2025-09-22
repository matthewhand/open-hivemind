import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

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
  refreshInterval = 30000
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Mock data for demonstration - in real implementation, this would come from API
  useEffect(() => {
    const fetchSystemData = () => {
      const mockMetrics: SystemMetrics = {
        cpu: {
          usage: Math.random() * 100,
          cores: 8,
          temperature: 45 + Math.random() * 20,
        },
        memory: {
          used: Math.random() * 16 * 1024, // GB
          total: 16 * 1024, // 16GB
          usage: Math.random() * 100,
        },
        disk: {
          used: Math.random() * 500, // GB
          total: 500, // 500GB
          usage: Math.random() * 100,
        },
        network: {
          latency: 20 + Math.random() * 50, // ms
          status: Math.random() > 0.9 ? 'slow' : Math.random() > 0.95 ? 'offline' : 'online',
        },
        uptime: Math.random() * 86400 * 7, // Up to 7 days
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
      };

      const mockHealthChecks: HealthCheck[] = [
        {
          id: '1',
          name: 'Database Connection',
          status: 'healthy',
          message: 'All database connections are operational',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '2',
          name: 'Discord API',
          status: Math.random() > 0.9 ? 'warning' : 'healthy',
          message: Math.random() > 0.9 ? 'High API response time detected' : 'Discord API is responding normally',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '3',
          name: 'LLM Services',
          status: Math.random() > 0.95 ? 'error' : Math.random() > 0.85 ? 'warning' : 'healthy',
          message: Math.random() > 0.95 ? 'OpenAI API is currently unavailable' : Math.random() > 0.85 ? 'Some LLM providers experiencing issues' : 'All LLM services are operational',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '4',
          name: 'Message Queue',
          status: 'healthy',
          message: 'Message processing is running smoothly',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
        {
          id: '5',
          name: 'Cache System',
          status: Math.random() > 0.9 ? 'warning' : 'healthy',
          message: Math.random() > 0.9 ? 'Cache hit rate is below optimal' : 'Cache system is performing well',
          lastChecked: new Date(Date.now() - Math.random() * 300000).toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setHealthChecks(mockHealthChecks);
      setLastRefresh(new Date());
      setLoading(false);
    };

    fetchSystemData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchSystemData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircleIcon color="success" />;
      case 'warning':
      case 'slow':
        return <WarningIcon color="warning" />;
      case 'error':
      case 'offline':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="action" />;
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
        return 'default';
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

  const getOverallHealth = () => {
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;

    if (errorCount > 0) return { status: 'error', message: `${errorCount} critical issues detected` };
    if (warningCount > 0) return { status: 'warning', message: `${warningCount} warnings detected` };
    return { status: 'healthy', message: 'All systems operational' };
  };

  const overallHealth = getOverallHealth();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading system health data...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            System Health Monitor
          </Typography>
          {lastRefresh && (
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        {/* Overall Health Status */}
        <Alert
          severity={overallHealth.status === 'healthy' ? 'success' : overallHealth.status === 'warning' ? 'warning' : 'error'}
          icon={getStatusIcon(overallHealth.status)}
          sx={{ mb: 3 }}
        >
          {overallHealth.message}
        </Alert>

        {/* System Metrics */}
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          System Metrics
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          {/* CPU Usage */}
          <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <SpeedIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">CPU Usage</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={metrics?.cpu.usage || 0}
                      color={(metrics?.cpu.usage || 0) > 80 ? 'error' : (metrics?.cpu.usage || 0) > 60 ? 'warning' : 'success'}
                    />
                  </Box>
                  <Typography variant="body2">
                    {(metrics?.cpu.usage || 0).toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {metrics?.cpu.cores} cores • {metrics?.cpu.temperature?.toFixed(0)}°C
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Memory Usage */}
          <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <MemoryIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Memory Usage</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={metrics?.memory.usage || 0}
                      color={(metrics?.memory.usage || 0) > 90 ? 'error' : (metrics?.memory.usage || 0) > 70 ? 'warning' : 'success'}
                    />
                  </Box>
                  <Typography variant="body2">
                    {(metrics?.memory.usage || 0).toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Disk Usage */}
          <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Disk Usage</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={metrics?.disk.usage || 0}
                      color={(metrics?.disk.usage || 0) > 90 ? 'error' : (metrics?.disk.usage || 0) > 80 ? 'warning' : 'success'}
                    />
                  </Box>
                  <Typography variant="body2">
                    {(metrics?.disk.usage || 0).toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(metrics?.disk.used || 0)} / {formatBytes(metrics?.disk.total || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Network Status */}
          <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <NetworkIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">Network Status</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={metrics?.network.status || 'unknown'}
                    color={getStatusColor(metrics?.network.status || 'unknown')}
                    size="small"
                  />
                  <Typography variant="body2">
                    {formatLatency(metrics?.network.latency || 0)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  System uptime: {formatUptime(metrics?.uptime || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Load Average */}
        <Typography variant="h6" gutterBottom>
          Load Average
        </Typography>
        <Box display="flex" gap={2} mb={3}>
          {metrics?.loadAverage.map((load, index) => (
            <Chip
              key={index}
              label={`${index + 1}m: ${load.toFixed(2)}`}
              variant="outlined"
              color={load > 2 ? 'error' : load > 1 ? 'warning' : 'success'}
            />
          ))}
        </Box>

        {/* Health Checks */}
        <Typography variant="h6" gutterBottom>
          Health Checks
        </Typography>

        <List>
          {healthChecks.map((check, index) => (
            <React.Fragment key={check.id}>
              <ListItem>
                <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                  {getStatusIcon(check.status)}
                </Box>

                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {check.name}
                      </Typography>
                      <Chip
                        label={check.status}
                        size="small"
                        color={getStatusColor(check.status)}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {check.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last checked: {new Date(check.lastChecked).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>

              {index < healthChecks.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {/* Detailed Information */}
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>System Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Metrics
                </Typography>
                <Typography variant="body2">
                  • CPU Load: {(metrics?.loadAverage[0] || 0).toFixed(2)} (1m), {(metrics?.loadAverage[1] || 0).toFixed(2)} (5m), {(metrics?.loadAverage[2] || 0).toFixed(2)} (15m)
                </Typography>
                <Typography variant="body2">
                  • Memory Available: {formatBytes((metrics?.memory.total || 0) - (metrics?.memory.used || 0))}
                </Typography>
                <Typography variant="body2">
                  • Disk Available: {formatBytes((metrics?.disk.total || 0) - (metrics?.disk.used || 0))}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 300, flex: '1 1 auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Network Status
                </Typography>
                <Typography variant="body2">
                  • Connection Status: {metrics?.network.status}
                </Typography>
                <Typography variant="body2">
                  • Response Time: {formatLatency(metrics?.network.latency || 0)}
                </Typography>
                <Typography variant="body2">
                  • System Uptime: {formatUptime(metrics?.uptime || 0)}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SystemHealth;