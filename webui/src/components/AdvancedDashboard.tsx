import React, { useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useGetStatusQuery, useGetPerformanceMetricsQuery, useGetAnalyticsQuery } from '../store/slices/apiSlice';
import { setLoading, setError, setLastUpdated, setAnalytics, addNotification } from '../store/slices/dashboardSlice';

const AdvancedDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(state => state.dashboard);
  
  // RTK Query hooks for real-time data
  const { error: statusError, isLoading: statusLoading } = useGetStatusQuery(undefined, {
    pollingInterval: 5000, // Poll every 5 seconds
  });
  
  const { data: performanceData, error: performanceError } = useGetPerformanceMetricsQuery(undefined, {
    pollingInterval: 1000, // Poll every second for real-time metrics
  });
  
  const { data: analyticsData } = useGetAnalyticsQuery({ timeRange: '24h' });

  useEffect(() => {
    if (statusLoading) {
      dispatch(setLoading(true));
    } else {
      dispatch(setLoading(false));
      dispatch(setLastUpdated());
    }
    
    if (statusError) {
      dispatch(setError(typeof statusError === 'string' ? statusError : 'Failed to fetch status'));
      dispatch(addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to fetch bot status data',
      }));
    }
    
    if (performanceError) {
      dispatch(addNotification({
        type: 'error', 
        title: 'Performance Error',
        message: 'Failed to fetch performance metrics',
      }));
    }
  }, [statusLoading, statusError, performanceError, dispatch]);

  useEffect(() => {
    if (performanceData) {
      // Performance metrics are automatically handled by the performance slice
      // when the API response is received through RTK Query
      console.log('Performance data received:', performanceData);
    }
  }, [performanceData]);

  useEffect(() => {
    if (analyticsData) {
      dispatch(setAnalytics({
        totalMessages: analyticsData.totalMessages,
        totalBots: analyticsData.totalBots,
        activeConnections: analyticsData.activeConnections,
        averageResponseTime: analyticsData.averageResponseTime,
        errorRate: analyticsData.errorRate,
        topChannels: analyticsData.topChannels,
        providerUsage: analyticsData.providerUsage,
        dailyStats: analyticsData.dailyStats,
      }));
    }
  }, [analyticsData, dispatch]);

  if (dashboard.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Advanced Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={() => {
                dispatch(addNotification({
                  type: 'info',
                  title: 'Refresh Initiated',
                  message: 'Dashboard data is being refreshed',
                }));
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Bot Status Overview */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bot Network Status
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {dashboard.bots.map((bot) => (
              <Chip
                key={bot.name}
                label={bot.name}
                color={bot.status === 'active' ? 'success' : bot.status === 'connecting' ? 'warning' : 'error'}
                variant="outlined"
                sx={{ minWidth: 120 }}
              />
            ))}
          </Box>
          {dashboard.bots.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No bots configured. Add bots from the Bot Manager.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card elevation={1}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Last Updated: {new Date(dashboard.lastUpdated).toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Auto Refresh: {dashboard.isAutoRefresh ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Refresh Interval: {(dashboard.refreshInterval / 1000).toFixed(1)}s
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Environment: {dashboard.systemStatus.environment}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedDashboard;