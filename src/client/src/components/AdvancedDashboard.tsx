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
import { Card, Badge, Alert, Loading, Button, Tooltip } from './DaisyUI';
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ChartPieIcon,
  ClockIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CpuChipIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
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
      <div className="p-6">
        <Alert variant="error">
          <h3 className="font-bold">Dashboard Failed to Load</h3>
          <p className="mt-2">
            Could not fetch initial status from the server. Please check your connection and the backend logs.
          </p>
          <p className="mt-4 text-xs font-mono">
            Error: {statusErrorMessage}
          </p>
        </Alert>
      </div>
    );
  }

  if (showGlobalLoader) {
    return (
      <div className="flex flex-row items-center justify-center gap-4 py-16">
        <Loading size="lg" />
        <p className="text-base-content/70">
          Loading dashboard data...
        </p>
      </div>
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
      icon: <CheckCircleIcon className="w-6 h-6 text-success" />,
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
      icon: <ArrowTrendingUpIcon className="w-6 h-6 text-primary" />,
      helper: `${activeConnections} live connections`,
    },
    {
      key: 'response',
      title: 'Avg Response',
      value: `${averageResponseTime.toFixed(1)} ms`,
      icon: <BoltIcon className="w-6 h-6 text-primary" />,
      helper: 'Rolling 24h average',
    },
    {
      key: 'errors',
      title: 'Error Rate',
      value: `${errorRatePercent.toFixed(2)}%`,
      icon: <ExclamationCircleIcon className={`w-6 h-6 ${errorRatePercent > 2 ? 'text-error' : 'text-warning'}`} />,
      helper: errorRatePercent > 2 ? 'Investigate issues' : 'Stable',
    },
  ];

  const performanceCards = [
    {
      key: 'cpu',
      title: 'CPU Usage',
      value: `${cpuUsage.toFixed(1)}%`,
      icon: <ArrowTrendingUpIcon className={`w-6 h-6 ${cpuUsage > 80 ? 'text-error' : 'text-primary'}`} />,
      helper: cpuUsage > 80 ? 'High load' : 'Operating nominally',
    },
    {
      key: 'memory',
      title: 'Memory Usage',
      value: `${memoryUsage.toFixed(1)}%`,
      icon: <CpuChipIcon className={`w-6 h-6 ${memoryUsage > 80 ? 'text-error' : 'text-primary'}`} />,
      helper: memoryUsage > 80 ? 'Consider scaling' : 'Within budget',
    },
    {
      key: 'latency',
      title: 'Response Time',
      value: `${responseTimeMs.toFixed(1)} ms`,
      icon: <BoltIcon className="w-6 h-6 text-secondary" />,
      helper: 'Last sample',
    },
    {
      key: 'perfErrors',
      title: 'Error Rate',
      value: `${performanceErrorRate.toFixed(2)}%`,
      icon: <ArrowTrendingDownIcon className={`w-6 h-6 ${performanceErrorRate > 5 ? 'text-error' : 'text-primary'}`} />,
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

  const navLinks = [
    { path: '/dashboard', icon: <ChartBarIcon className="w-4 h-4" />, label: 'Dashboard' },
    { path: '/bots', icon: <UserGroupIcon className="w-4 h-4" />, label: 'Bot Manager' },
    { path: '/config', icon: <WrenchScrewdriverIcon className="w-4 h-4" />, label: 'Configuration' },
    { path: '/performance', icon: <ChartPieIcon className="w-4 h-4" />, label: 'Performance Monitor' },
    { path: '/monitoring', icon: <ClockIcon className="w-4 h-4" />, label: 'Real-Time Dashboard' },
    { path: '/settings', icon: <Cog6ToothIcon className="w-4 h-4" />, label: 'Settings' },
    { path: '/system', icon: <ComputerDesktopIcon className="w-4 h-4" />, label: 'System' },
  ];

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Advanced Dashboard
        </h1>
        <div className="flex items-center gap-3">
          {isRefreshing && <Loading size="sm" />}
          <Tooltip content="Refresh Data">
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="ghost" size="sm">
              <ArrowPathIcon className="w-5 h-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Settings">
            <Button variant="ghost" size="sm">
              <Cog6ToothIcon className="w-5 h-5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {dashboardError && (
        <Alert variant="error" className="mb-6">
          {dashboardError}
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap mb-6">
        {navLinks.map((link) => (
          <Button
            key={link.path}
            component={Link}
            to={link.path}
            variant={location.pathname === link.path ? 'primary' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            {link.icon}
            {link.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <Card key={card.key}>
            <Card.Body>
              <div className="flex items-center gap-4">
                {card.icon}
                <div>
                  <p className="text-sm text-base-content/70">
                    {card.title}
                  </p>
                  <h2 className="text-2xl font-bold">
                    {card.value}
                  </h2>
                  <p className="text-sm text-base-content/70">
                    {card.helper}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {performanceCards.map((card) => (
          <Card key={card.key}>
            <Card.Body>
              <div className="flex items-center gap-4">
                {card.icon}
                <div>
                  <p className="text-sm text-base-content/70">
                    {card.title}
                  </p>
                  <h3 className="text-xl font-bold">
                    {card.value}
                  </h3>
                  <p className="text-sm text-base-content/70">
                    {card.helper}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Bot Status Overview */}
      <Card>
        <Card.Body>
          <Card.Title>Bot Network Status</Card.Title>
          <div className="flex flex-wrap gap-2 mt-4">
            {bots.map((bot) => (
              <Badge
                key={bot.name}
                variant={bot.status === 'active' ? 'success' : bot.status === 'connecting' ? 'warning' : 'error'}
                size="lg"
              >
                {bot.name}
              </Badge>
            ))}
          </div>
          {bots.length === 0 && (
            <p className="text-base-content/70 mt-4">
              No bots configured. Add bots from the Bot Manager.
            </p>
          )}
          {offlineBotCount > 0 && (
            <Alert variant="warning" className="mt-4">
              {offlineBotCount} bot{offlineBotCount === 1 ? '' : 's'} offline. Check connection settings.
            </Alert>
          )}
        </Card.Body>
      </Card>

    </div>
  );
};

export default AdvancedDashboard;