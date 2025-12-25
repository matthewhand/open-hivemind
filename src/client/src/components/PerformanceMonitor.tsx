import React from 'react';
import { Alert, Card, Loading, Button } from './DaisyUI';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
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
  if (!error) {return 'Unknown error';}
  if (typeof error === 'string') {return error;}

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Performance Monitor
          </h1>
          <p className="text-base-content/70">
            Real-time metrics for Open-Hivemind services
          </p>
        </div>
        <Button
          variant="secondary" className="btn-outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" className="mb-6">
          {errorMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <Card.Body>
            <Card.Title>
              Resource Utilisation
            </Card.Title>
            <div className="space-y-3 mt-2">
              <p className="text-base">
                CPU Usage: {cpuUsage.toFixed(1)}%
              </p>
              <p className="text-base">
                Memory Usage: {memoryUsage.toFixed(1)}%
              </p>
              <p className="text-base">
                Active Connections: {activeConnections}
              </p>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <Card.Title>
              Latency & Reliability
            </Card.Title>
            <div className="space-y-3 mt-2">
              <p className="text-base">
                Response Time: {responseTime.toFixed(1)} ms
              </p>
              <p className="text-base">
                Error Rate: {errorRate.toFixed(2)}%
              </p>
              <p className="text-base">
                Uptime: {uptimeHours}h {uptimeMinutes}m
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {isFetching && (
        <div className="flex items-center gap-3 mt-6">
          <span className="loading loading-spinner loading-sm"></span>
          <p className="text-sm text-base-content/70">
            Updating metrics...
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
