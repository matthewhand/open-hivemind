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
import {
  addNotification,
  setAnalytics,
  setBots,
  setError,
  setLastUpdated,
  setLoading,
  setPerformanceMetrics,
  setSystemStatus,
} from '../store/slices/dashboardSlice';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;

  const baseQueryError = error as FetchBaseQueryError;
  if (typeof baseQueryError?.status !== 'undefined') {
    if (typeof baseQueryError.data === 'string') {
      return baseQueryError.data;
    }
    if (typeof baseQueryError.status === 'number') {
      return `Request failed with status ${baseQueryError.status}`;
    }
    return 'Request failed';
  }

  const serialized = error as SerializedError;
  if (serialized?.message) {
    return serialized.message;
  }

  return 'Unexpected error';
};

const AdvancedDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(state => state.dashboard);
  const {
    bots,
    systemStatus,
    performanceMetrics,
    analytics,
    isLoading: dashboardLoading,
    error: dashboardError,
    lastUpdated,
    isAutoRefresh,
    refreshInterval,
  } = dashboard;
  
  // RTK Query hooks for real-time data
  const {
    data: statusData,
    error: statusError,
    isLoading: statusLoading,
    isFetching: isFetchingStatus,
    refetch: refetchStatus,
  } = useGetStatusQuery(undefined, {
    pollingInterval: 5000, // Poll every 5 seconds
  });
  
  const {
    data: performanceData,
    error: performanceError,
    isFetching: isFetchingPerformance,
    refetch: refetchPerformance,
  } = useGetPerformanceMetricsQuery(undefined, {
    pollingInterval: 5000, // Poll periodically for real-time metrics
  });
  
  const {
    data: analyticsData,
    isFetching: isFetchingAnalytics,
    refetch: refetchAnalytics,
  } = useGetAnalyticsQuery({ timeRange: '24h' });

  const statusErrorMessage = statusError ? getErrorMessage(statusError) : null;
  const performanceErrorMessage = performanceError ? getErrorMessage(performanceError) : null;
  const showGlobalLoader = dashboardLoading && !bots.length;

  useEffect(() => {
    dispatch(setLoading(statusLoading && !statusData));
  }, [dispatch, statusData, statusLoading]);

  useEffect(() => {
    if (!statusData) {
      return;
    }

    dispatch(setBots(statusData.bots ?? []));

    if (typeof statusData.uptime === 'number') {
      dispatch(setSystemStatus({ uptime: statusData.uptime }));
    }

    dispatch(setLastUpdated());
    dispatch(setError(null));
  }, [dispatch, statusData]);

  useEffect(() => {
    if (!statusErrorMessage) {
      return;
    }

    if (dashboardError === statusErrorMessage) {
      return;
    }

    dispatch(setError(statusErrorMessage));
    dispatch(addNotification({
      type: 'error',
      title: 'Connection Error',
      message: statusErrorMessage,
    }));
  }, [statusErrorMessage, dashboardError, dispatch]);

  useEffect(() => {
    if (!performanceErrorMessage) {
      return;
    }

    dispatch(addNotification({
      type: 'error',
      title: 'Performance Error',
      message: performanceErrorMessage,
    }));
  }, [performanceErrorMessage, dispatch]);

  useEffect(() => {
    if (performanceData) {
      dispatch(setPerformanceMetrics(performanceData));
    }
  }, [dispatch, performanceData]);

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
  const totalBots = bots.length;
  const activeBotCount = bots.filter(bot => bot.status === 'active').length;
  const connectingBotCount = bots.filter(bot => bot.status === 'connecting').length;
  const offlineBotCount = Math.max(totalBots - activeBotCount - connectingBotCount, 0);

  const totalMessages = analytics.totalMessages ?? 0;
  const activeConnections = analytics.activeConnections ?? 0;
  const averageResponseTime = analytics.averageResponseTime ?? 0;
  const rawErrorRate = analytics.errorRate ?? 0;
  const errorRatePercent = rawErrorRate > 1 ? rawErrorRate : rawErrorRate * 100;

  const cpuUsage = performanceMetrics.cpuUsage ?? 0;
  const memoryUsage = performanceMetrics.memoryUsage ?? 0;
  const responseTimeMs = performanceMetrics.responseTime ?? averageResponseTime;
  const performanceErrorRate = performanceMetrics.errorRate ?? 0;

  const uptimeSeconds = systemStatus.uptime ?? 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;

  const summaryCards = [
    {
      key: 'activeBots',
      title: 'Active Bots',
      value: `${activeBotCount}/${totalBots}`,
      icon: <CheckCircleIcon color="success" />,
      helper: connectingBotCount > 0
        ? `${connectingBotCount} connecting`
        : offlineBotCount > 0
          ? `${offlineBotCount} offline`
          : 'All healthy',
    },
    {
      key: 'messages',
      title: 'Messages (24h)',
      value: totalMessages.toLocaleString(),
      icon: <TrendingUpIcon color="primary" />,
      helper: `${activeConnections} live connections`,
    },
    {
      key: 'response',
      title: 'Avg Response',
      value: `${averageResponseTime.toFixed(1)} ms`,
      icon: <SpeedIcon color="primary" />,
      helper: 'Rolling 24h average',
    },
    {
      key: 'errors',
      title: 'Error Rate',
      value: `${errorRatePercent.toFixed(2)}%`,
      icon: <ErrorIcon color={errorRatePercent > 2 ? 'error' : 'warning'} />,
      helper: errorRatePercent > 2 ? 'Investigate issues' : 'Stable',
    },
  ];

  const performanceCards = [
    {
      key: 'cpu',
      title: 'CPU Usage',
      value: `${cpuUsage.toFixed(1)}%`,
      icon: <TrendingUpIcon color={cpuUsage > 80 ? 'error' : 'primary'} />,
      helper: cpuUsage > 80 ? 'High load' : 'Operating nominally',
    },
    {
      key: 'memory',
      title: 'Memory Usage',
      value: `${memoryUsage.toFixed(1)}%`,
      icon: <MemoryIcon color={memoryUsage > 80 ? 'error' : 'primary'} />,
      helper: memoryUsage > 80 ? 'Consider scaling' : 'Within budget',
    },
    {
      key: 'latency',
      title: 'Response Time',
      value: `${responseTimeMs.toFixed(1)} ms`,
      icon: <SpeedIcon color="secondary" />,
      helper: 'Last sample',
    },
    {
      key: 'perfErrors',
      title: 'Error Rate',
      value: `${performanceErrorRate.toFixed(2)}%`,
      icon: <TrendingDownIcon color={performanceErrorRate > 5 ? 'error' : 'primary'} />,
      helper: performanceErrorRate > 5 ? 'Errors above threshold' : 'Within tolerance',
    },
  ];

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
      {/* Header Section */}
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

      {dashboardError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {dashboardError}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <Card elevation={1}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  {card.icon}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h5" component="p">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.helper}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {performanceCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <Card elevation={1}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  {card.icon}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h6" component="p">
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.helper}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bot Status Overview */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bot Network Status
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {bots.map((bot) => (
              <Chip
                key={bot.name}
                label={bot.name}
                color={bot.status === 'active' ? 'success' : bot.status === 'connecting' ? 'warning' : 'error'}
                variant="outlined"
                sx={{ minWidth: 120 }}
              />
            ))}
          </Box>
          {bots.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No bots configured. Add bots from the Bot Manager.
            </Typography>
          )}
          {offlineBotCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {offlineBotCount} bot{offlineBotCount === 1 ? '' : 's'} offline. Check connection settings.
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
                Last Updated: {new Date(lastUpdated).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Auto Refresh: {isAutoRefresh ? 'Enabled' : 'Disabled'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Refresh Interval: {(refreshInterval / 1000).toFixed(1)}s
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Environment: {systemStatus.environment}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Uptime: {uptimeDisplay}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedDashboard;
