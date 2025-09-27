/**
 * @fileoverview Simple Working Dashboard - Streamlined version without type issues
 * 
 * Provides basic system monitoring without complex type dependencies
 * 
 * @version 2.1.0
 * @author Open-Hivemind Team
 * @since 2025-09-27
 */

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
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useGetStatusQuery, useGetPerformanceMetricsQuery, useGetAnalyticsQuery } from '../store/slices/apiSlice';
import {
  addNotification,
  setAnalytics,
  setBots,
  setError,
  setLastUpdated,
  setLoading,
} from '../store/slices/dashboardSlice';

/**
 * Simple Dashboard Component
 * 
 * @returns {JSX.Element} The rendered dashboard
 */
const AdvancedDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(state => state.dashboard);
  
  // RTK Query hooks for real-time data
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
    isFetching: isFetchingStatus,
    refetch: refetchStatus,
  } = useGetStatusQuery(undefined, {
    pollingInterval: 5000,
  });
  
  const {
    data: performanceData,
    error: performanceError,
    isFetching: isFetchingPerformance,
    refetch: refetchPerformance,
  } = useGetPerformanceMetricsQuery(undefined, {
    pollingInterval: 5000,
  });
  
  const {
    data: analyticsData,
    isFetching: isFetchingAnalytics,
    refetch: refetchAnalytics,
  } = useGetAnalyticsQuery({ timeRange: '24h' });

  // Show loading when we don't have any data yet
  const showGlobalLoader = statusLoading && !statusData && dashboard.bots.length === 0;

  // Handle loading state
  useEffect(() => {
    dispatch(setLoading(statusLoading && !statusData));
  }, [dispatch, statusData, statusLoading]);

  // Process status data safely
  useEffect(() => {
    if (!statusData) return;

    try {
      // Handle different possible data structures from backend
      let bots = [];
      if (statusData.bots && Array.isArray(statusData.bots)) {
        bots = statusData.bots;
      } else if ((statusData as any).instances && Array.isArray((statusData as any).instances)) {
        bots = (statusData as any).instances;
      }

      // Normalize bot data
      const normalizedBots = bots.map((bot: any, index: number) => ({
        name: bot?.name || `Bot ${index + 1}`,
        provider: bot?.provider || 'unknown',
        llmProvider: bot?.llmProvider || 'unknown',
        status: bot?.status || 'offline',
        connected: bot?.connected ?? false,
        messageCount: bot?.messageCount || 0,
        errorCount: bot?.errorCount || 0,
        lastUpdated: bot?.lastUpdated || new Date().toISOString(),
      }));

      dispatch(setBots(normalizedBots));
      dispatch(setLastUpdated());
      dispatch(setError(null));
    } catch (error) {
      console.error('Error processing status data:', error);
      dispatch(setError('Failed to process status data'));
    }
  }, [dispatch, statusData]);

  // Handle status errors
  useEffect(() => {
    if (statusError) {
      const errorMessage = typeof statusError === 'string' 
        ? statusError 
        : 'Failed to fetch status data';
      
      dispatch(setError(errorMessage));
      dispatch(addNotification({
        type: 'error',
        title: 'Connection Error',
        message: errorMessage,
      }));
    }
  }, [statusError, dispatch]);

  // Handle performance errors
  useEffect(() => {
    if (performanceError) {
      dispatch(addNotification({
        type: 'error',
        title: 'Performance Error',
        message: 'Failed to fetch performance metrics',
      }));
    }
  }, [performanceError, dispatch]);

  // Handle analytics data
  useEffect(() => {
    if (analyticsData) {
      dispatch(setAnalytics(analyticsData));
    }
  }, [analyticsData, dispatch]);

  // Show loading state
  if (showGlobalLoader) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ py: 8 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Loading dashboard data...
        </Typography>
      </Stack>
    );
  }

  const isRefreshing = isFetchingStatus || isFetchingPerformance || isFetchingAnalytics;
  const totalBots = dashboard.bots.length;
  const activeBots = dashboard.bots.filter(bot => bot.status === 'active').length;
  const offlineBots = totalBots - activeBots;

  const handleRefresh = () => {
    refetchStatus();
    refetchPerformance();
    refetchAnalytics();
    dispatch(addNotification({
      type: 'info',
      title: 'Refresh triggered',
      message: 'Fetching latest dashboard data...',
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Advanced Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={1.5}>
          {isRefreshing && <CircularProgress size={20} />}
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {dashboard.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Dashboard Failed to Load: {dashboard.error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Bots
                  </Typography>
                  <Typography variant="h5" component="p">
                    {activeBots}/{totalBots}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {offlineBots > 0 ? `${offlineBots} offline` : 'All healthy'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUpIcon color="primary" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Messages (24h)
                  </Typography>
                  <Typography variant="h5" component="p">
                    {dashboard.analytics.totalMessages?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboard.analytics.activeConnections || 0} connections
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SpeedIcon color="primary" />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Response Time
                  </Typography>
                  <Typography variant="h5" component="p">
                    {(dashboard.analytics.averageResponseTime || 0).toFixed(1)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    24h average
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={1}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color={dashboard.analytics.errorRate > 0.02 ? 'error' : 'success'} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Error Rate
                  </Typography>
                  <Typography variant="h5" component="p">
                    {((dashboard.analytics.errorRate || 0) * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboard.analytics.errorRate > 0.02 ? 'Needs attention' : 'Stable'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bot Status */}
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
                variant={bot.connected ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          {dashboard.bots.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No bots configured. Add bots from the Bot Manager.
            </Typography>
          )}
          {offlineBots > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {offlineBots} bot{offlineBots === 1 ? '' : 's'} offline. Check connection settings.
            </Alert>
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
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Last Updated: {new Date(dashboard.lastUpdated).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Auto Refresh: {dashboard.isAutoRefresh ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Refresh Interval: {(dashboard.refreshInterval / 1000).toFixed(1)}s
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Environment: {dashboard.systemStatus.environment || 'Production'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Uptime: {Math.floor((dashboard.systemStatus.uptime || 0) / 3600)}h {Math.floor(((dashboard.systemStatus.uptime || 0) % 3600) / 60)}m
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedDashboard;