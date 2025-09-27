import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { Refresh as RefreshIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useGetPerformanceMetricsQuery } from '../store/slices/apiSlice';
import { useThemeEngine } from '../themes/useThemeEngine';
import LoadingSpinner from './LoadingSpinner';

const defaultMetrics = {
  cpuUsage: 0,
  memoryUsage: 0,
  responseTime: 0,
  errorRate: 0,
  uptime: 0,
  activeConnections: 0,
};

const toErrorMessage = (error: unknown): string => {
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
    return 'Performance service unavailable';
  }

  const serialized = error as SerializedError;
  if (serialized?.message) {
    return serialized.message;
  }

  return 'Unexpected error while fetching performance metrics';
};

interface ChartDataPoint {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const theme = useTheme();
  const { currentTheme, setCurrentTheme } = useThemeEngine();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(currentTheme === 'dark');

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetPerformanceMetricsQuery(undefined, { pollingInterval: 5000 });

  const metrics = data ?? defaultMetrics;
  const errorMessage = error ? toErrorMessage(error) : null;

  // Update chart data when new metrics arrive
  useEffect(() => {
    const newDataPoint: ChartDataPoint = {
      timestamp: new Date().toLocaleTimeString(),
      cpuUsage: metrics.cpuUsage,
      memoryUsage: metrics.memoryUsage,
      responseTime: metrics.responseTime,
    };

    setChartData(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only last 20 data points for real-time view
      return updated.slice(-20);
    });
  }, [metrics]);

  // Sync dark mode with theme engine
  useEffect(() => {
    setIsDarkMode(currentTheme === 'dark');
  }, [currentTheme]);

  const handleDarkModeToggle = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setCurrentTheme(newTheme);
  };

  if (isLoading && !data) {
    return <LoadingSpinner message="Loading performance data..." />;
  }

  const cpuUsage = metrics.cpuUsage ?? 0;
  const memoryUsage = metrics.memoryUsage ?? 0;
  const responseTime = metrics.responseTime ?? 0;
  const errorRate = metrics.errorRate ?? 0;
  const uptimeSeconds = metrics.uptime ?? 0;
  const activeConnections = metrics.activeConnections ?? 0;

  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

  // Alert thresholds
  const alerts = [];
  if (cpuUsage > 80) {
    alerts.push({
      severity: 'error' as const,
      message: `High CPU usage: ${cpuUsage.toFixed(1)}%`,
    });
  } else if (cpuUsage > 60) {
    alerts.push({
      severity: 'warning' as const,
      message: `Elevated CPU usage: ${cpuUsage.toFixed(1)}%`,
    });
  }

  if (memoryUsage > 85) {
    alerts.push({
      severity: 'error' as const,
      message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
    });
  } else if (memoryUsage > 70) {
    alerts.push({
      severity: 'warning' as const,
      message: `Elevated memory usage: ${memoryUsage.toFixed(1)}%`,
    });
  }

  if (responseTime > 1000) {
    alerts.push({
      severity: 'error' as const,
      message: `Slow response time: ${responseTime.toFixed(1)}ms`,
    });
  } else if (responseTime > 500) {
    alerts.push({
      severity: 'warning' as const,
      message: `Elevated response time: ${responseTime.toFixed(1)}ms`,
    });
  }

  if (errorRate > 5) {
    alerts.push({
      severity: 'error' as const,
      message: `High error rate: ${errorRate.toFixed(2)}%`,
    });
  } else if (errorRate > 1) {
    alerts.push({
      severity: 'warning' as const,
      message: `Elevated error rate: ${errorRate.toFixed(2)}%`,
    });
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Performance Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time metrics for Open-Hivemind services
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={isDarkMode}
                onChange={handleDarkModeToggle}
                icon={<LightModeIcon />}
                checkedIcon={<DarkModeIcon />}
              />
            }
            label="Dark Mode"
          />
          <Button
            variant="outlined"
            startIcon={isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
            onClick={() => refetch()}
            disabled={isFetching}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}
      {alerts.map((a, idx) => (
        <Alert
          key={`metric-alert-${idx}`}
          severity={a.severity}
          sx={{ mb: 2 }}
          variant="outlined"
        >
          {a.message}
        </Alert>
      ))}

      <Grid container spacing={3}>
        {/* Metric Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">CPU Usage</Typography>
              <Typography variant="h4">{cpuUsage.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Memory Usage</Typography>
              <Typography variant="h4">{memoryUsage.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Response Time</Typography>
              <Typography variant="h4">{responseTime.toFixed(1)} ms</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">Uptime</Typography>
              <Typography variant="h4">{uptimeHours}h {uptimeMinutes}m</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-Time Metrics
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} />
                    <YAxis yAxisId="left" stroke={theme.palette.primary.main} />
                    <YAxis yAxisId="right" orientation="right" stroke={theme.palette.secondary.main} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        borderColor: theme.palette.divider,
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="cpuUsage"
                      stroke={theme.palette.primary.main}
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                      name="CPU (%)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="memoryUsage"
                      stroke={theme.palette.secondary.main}
                      fillOpacity={1}
                      fill="url(#colorMemory)"
                      name="Memory (%)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="responseTime"
                      stroke={theme.palette.warning.main}
                      name="Response (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional charts for response time and error rate */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Time Trend
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} />
                    <YAxis stroke={theme.palette.warning.main} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        borderColor: theme.palette.divider,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke={theme.palette.warning.main}
                      name="Response (ms)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Rate
              </Typography>
              <Typography variant="h4" color="error">
                {errorRate.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Errors per minute
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceMonitor;
