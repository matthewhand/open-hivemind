/**
 * @fileoverview Advanced Dashboard Component - Real-time monitoring interface
 * 
 * Provides comprehensive system monitoring including:
 * - Bot status and health monitoring
 * - Performance metrics (CPU, memory, response time)
 * - Analytics and usage statistics
 * - Error tracking and notifications
 * 
 * @version 2.1.0
 * @author Open-Hivemind Team
 * @since 2025-09-27
 */

import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Button,
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
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Computer as ComputerIcon,
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

/**
 * Safely extracts error messages from various error types
 * @param error - Error object from RTK Query or other sources
 * @returns Human-readable error message
 */
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

/**
 * Debug utility for logging dashboard state changes
 * Only logs in development mode
 */
const debugLog = (context: string, data: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AdvancedDashboard:${context}]`, data);
  }
};

/**
 * Advanced Dashboard Component
 * 
 * Real-time monitoring interface for the Open-Hivemind system.
 * Handles data fetching, error states, and provides comprehensive
 * system health visualization.
 * 
 * @component
 * @returns {JSX.Element} The rendered dashboard
 */
const AdvancedDashboard: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector(state => state.dashboard);

  debugLog('Dashboard state', dashboard);
  const {
    bots,
    performanceMetrics,
    analytics,
    isLoading: dashboardLoading,
    error: dashboardError,
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
  
  // Enhanced loading logic
  const showGlobalLoader = (statusLoading && !statusData) || (dashboardLoading && !bots.length);

  // Loading state management
  useEffect(() => {
    debugLog('Loading state update', { statusLoading, hasStatusData: !!statusData });
    dispatch(setLoading(statusLoading && !statusData));
  }, [dispatch, statusData, statusLoading]);

  // Status data processing with error boundaries and validation
  useEffect(() => {
    if (!statusData) {
      debugLog('Status data not available', statusData);
      return;
    }

    try {
      debugLog('Processing status data', statusData);
      
      // Defensive check for bots array (backend might rename to 'instances')
      // Handle multiple potential data shapes for maximum compatibility
      const possibleBotsSources = [
        (statusData as any)?.bots,
        (statusData as any)?.instances,
        (statusData as any)?.botInstances,
        (statusData as any)?.agents,
      ];
      
      const rawBots = possibleBotsSources.find(source => Array.isArray(source)) || [];
      
      // Validate and normalize bot data
      const normalizedBots = rawBots.map((bot: any, index: number) => {
        if (!bot || typeof bot !== 'object') {
          debugLog('Invalid bot object', { bot, index });
          return null;
        }
        
        return {
          name: bot.name || `Unknown Bot ${index + 1}`,
          provider: bot.provider || 'unknown',
          llmProvider: bot.llmProvider || 'unknown',
          status: bot.status || 'offline',
          healthDetails: bot.healthDetails || {},
          connected: bot.connected ?? false,
          messageCount: bot.messageCount || 0,
          errorCount: bot.errorCount || 0,
          lastUpdated: bot.lastUpdated || new Date().toISOString(),
        };
      }).filter((bot: any): bot is any => bot !== null);

      debugLog('Normalized bots', normalizedBots);
      dispatch(setBots(normalizedBots));

      // System status processing with validation
      if (typeof (statusData as any)?.uptime === 'number' && (statusData as any).uptime >= 0) {
        const systemStatusUpdate = {
          uptime: (statusData as any).uptime,
          version: (statusData as any)?.version || '2.0.0',
          environment: (statusData as any)?.environment || 'production',
        };
        
        debugLog('System status update', systemStatusUpdate);
        dispatch(setSystemStatus(systemStatusUpdate));
      } else {
        debugLog('Invalid uptime data', (statusData as any)?.uptime);
      }

      dispatch(setLastUpdated());
      dispatch(setError(null));
      
    } catch (error) {
      debugLog('Error processing status data', error);
      dispatch(setError(`Failed to process status data: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }, [dispatch, statusData]);

  // Error handling with deduplication and proper logging
  useEffect(() => {
    if (!statusErrorMessage) {
      return;
    }

    if (dashboardError === statusErrorMessage) {
      debugLog('Duplicate error message ignored', statusErrorMessage);
      return;
    }

    debugLog('Status error occurred', { statusErrorMessage, dashboardError });
    
    dispatch(setError(statusErrorMessage));
    dispatch(addNotification({
      type: 'error',
      title: 'Connection Error',
      message: statusErrorMessage,
    }));
  }, [statusErrorMessage, dashboardError, dispatch]);

  // Performance error handling
  useEffect(() => {
    if (!performanceErrorMessage) {
      return;
    }

    debugLog('Performance error occurred', performanceErrorMessage);
    
    dispatch(addNotification({
      type: 'error',
      title: 'Performance Error',
      message: performanceErrorMessage,
    }));
  }, [performanceErrorMessage, dispatch]);

  // Performance metrics processing with validation
  useEffect(() => {
    if (performanceData) {
      debugLog('Performance data received', performanceData);
      
      // Validate performance metrics before dispatch
      const validatedMetrics = {
        cpuUsage: Math.max(0, Math.min(100, performanceData.cpuUsage || 0)),
        memoryUsage: Math.max(0, Math.min(100, performanceData.memoryUsage || 0)),
        responseTime: Math.max(0, performanceData.responseTime || 0),
        errorRate: Math.max(0, Math.min(1, performanceData.errorRate || 0)),
        uptime: Math.max(0, performanceData.uptime || 0),
        activeConnections: Math.max(0, performanceData.activeConnections || 0),
      };
      
      dispatch(setPerformanceMetrics(validatedMetrics));
    }
  }, [dispatch, performanceData]);

  // Analytics data processing with validation
  useEffect(() => {
    if (analyticsData) {
      debugLog('Analytics data received', analyticsData);
      
      // Validate analytics data before dispatch
      const validatedAnalytics = {
        totalMessages: Math.max(0, analyticsData.totalMessages || 0),
        totalBots: Math.max(0, analyticsData.totalBots || 0),
        activeConnections: Math.max(0, analyticsData.activeConnections || 0),
        averageResponseTime: Math.max(0, analyticsData.averageResponseTime || 0),
        errorRate: Math.max(0, Math.min(1, analyticsData.errorRate || 0)),
        topChannels: Array.isArray(analyticsData.topChannels) ? analyticsData.topChannels : [],
        providerUsage: analyticsData.providerUsage && typeof analyticsData.providerUsage === 'object' 
          ? analyticsData.providerUsage 
          : {},
        dailyStats: Array.isArray(analyticsData.dailyStats) ? analyticsData.dailyStats : [],
      };
      
      dispatch(setAnalytics(validatedAnalytics));
    }
  }, [analyticsData, dispatch]);

  // Prioritize showing error over loader if initial fetch fails
  if (statusErrorMessage && !statusData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Dashboard Failed to Load</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Could not fetch initial status from the server. Please check your connection and the backend logs.
          </Typography>
          <Typography variant="caption" sx={{ mt: 2, display: 'block', fontFamily: 'monospace' }}>
            Error: {statusErrorMessage}
          </Typography>
        </Alert>
      </Box>
    );
  }

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

  /**
   * Handles manual refresh of all dashboard data
   * Provides user feedback and logs refresh attempts
   */
  const handleRefresh = () => {
    debugLog('Manual refresh triggered', new Date().toISOString());
    
    try {
      refetchStatus();
      refetchPerformance();
      refetchAnalytics();
      
      dispatch(addNotification({
        type: 'info',
        title: 'Refresh triggered',
        message: 'Fetching latest dashboard data...',
      }));
    } catch (error) {
      debugLog('Refresh failed', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: `Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
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

      {/* Navigation */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          component={Link}
          to="/dashboard"
          variant={location.pathname === '/dashboard' ? 'contained' : 'outlined'}
          startIcon={<DashboardIcon />}
          size="small"
        >
          Dashboard
        </Button>
        <Button
          component={Link}
          to="/bots"
          variant={location.pathname === '/bots' ? 'contained' : 'outlined'}
          startIcon={<PeopleIcon />}
          size="small"
        >
          Bot Manager
        </Button>
        <Button
          component={Link}
          to="/config"
          variant={location.pathname === '/config' ? 'contained' : 'outlined'}
          startIcon={<BuildIcon />}
          size="small"
        >
          Configuration
        </Button>
        <Button
          component={Link}
          to="/performance"
          variant={location.pathname === '/performance' ? 'contained' : 'outlined'}
          startIcon={<AssessmentIcon />}
          size="small"
        >
          Performance Monitor
        </Button>
        <Button
          component={Link}
          to="/monitoring"
          variant={location.pathname === '/monitoring' ? 'contained' : 'outlined'}
          startIcon={<TimelineIcon />}
          size="small"
        >
          Real-Time Dashboard
        </Button>
        <Button
          component={Link}
          to="/settings"
          variant={location.pathname === '/settings' ? 'contained' : 'outlined'}
          startIcon={<SettingsIcon />}
          size="small"
        >
          Settings
        </Button>
        <Button
          component={Link}
          to="/system"
          variant={location.pathname === '/system' ? 'contained' : 'outlined'}
          startIcon={<ComputerIcon />}
          size="small"
        >
          System
        </Button>
      </Box>

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

    </Box>
  );
};

export default AdvancedDashboard;