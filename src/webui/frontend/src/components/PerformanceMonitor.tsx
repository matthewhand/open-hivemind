import React from 'react';
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
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import { useGetPerformanceMetricsQuery } from '../store/slices/apiSlice';
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

const PerformanceMonitor: React.FC = () => {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetPerformanceMetricsQuery(undefined, { pollingInterval: 5000 });

  const metrics = data ?? defaultMetrics;
  const errorMessage = error ? toErrorMessage(error) : null;

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

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Performance Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time metrics for Open-Hivemind services
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={isFetching ? <CircularProgress size={18} /> : <RefreshIcon />}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resource Utilisation
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Typography variant="body1">
                  CPU Usage: {cpuUsage.toFixed(1)}%
                </Typography>
                <Typography variant="body1">
                  Memory Usage: {memoryUsage.toFixed(1)}%
                </Typography>
                <Typography variant="body1">
                  Active Connections: {activeConnections}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Latency & Reliability
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Typography variant="body1">
                  Response Time: {responseTime.toFixed(1)} ms
                </Typography>
                <Typography variant="body1">
                  Error Rate: {errorRate.toFixed(2)}%
                </Typography>
                <Typography variant="body1">
                  Uptime: {uptimeHours}h {uptimeMinutes}m
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isFetching && (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 3 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Updating metrics...
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default PerformanceMonitor;
