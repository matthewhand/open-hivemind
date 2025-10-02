import React from 'react';
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

const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h5M20 20v-5h-5M20 4s-1.5-2-5-2-8 4-8 4"
    />
  </svg>
);

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
          <h1 className="text-3xl font-bold mb-1">Performance Monitor</h1>
          <p className="text-base-content/70">
            Real-time metrics for Open-Hivemind services
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <span className="loading loading-spinner" />
          ) : (
            <RefreshIcon />
          )}
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div role="alert" className="alert alert-error mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title">Resource Utilisation</h2>
            <div className="space-y-2 mt-2">
              <p>CPU Usage: {cpuUsage.toFixed(1)}%</p>
              <p>Memory Usage: {memoryUsage.toFixed(1)}%</p>
              <p>Active Connections: {activeConnections}</p>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title">Latency & Reliability</h2>
            <div className="space-y-2 mt-2">
              <p>Response Time: {responseTime.toFixed(1)} ms</p>
              <p>Error Rate: {errorRate.toFixed(2)}%</p>
              <p>
                Uptime: {uptimeHours}h {uptimeMinutes}m
              </p>
            </div>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="flex items-center space-x-2 mt-6">
          <span className="loading loading-spinner loading-sm" />
          <p className="text-base-content/70">Updating metrics...</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
