/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService } from './core';
import type { ActivityResponse, StatusResponse } from './types';

/** A single span recorded by the server-side PipelineTracer. */
export interface PipelineTraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  children: PipelineTraceSpan[];
}

/** A completed message-pipeline trace from /api/admin/decision-traces. */
export interface PipelineTrace {
  traceId: string;
  rootSpan: PipelineTraceSpan;
  spans: PipelineTraceSpan[];
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
}

export function monitoringMixin(api: ApiService) {
  return {
    getStatus(): Promise<StatusResponse> {
      return api
        .request<{ success?: boolean; data?: StatusResponse } | StatusResponse>(
          '/api/dashboard/status'
        )
        .then((res) => {
          // Prefer unwrapped ApiResponse envelope; fall back to bare payload.
          if (res && typeof res === 'object' && 'data' in res && (res as { data?: StatusResponse }).data) {
            return (res as { data: StatusResponse }).data;
          }
          return res as StatusResponse;
        });
    },


    /** Recent completed message-pipeline traces recorded by the PipelineTracer. */
    getDecisionTraces(): Promise<{ traces: PipelineTrace[] }> {
      return api.request<{ traces: PipelineTrace[] }>('/api/admin/decision-traces');
    },

    getActivity(params: {
      bot?: string;
      messageProvider?: string;
      llmProvider?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      offset?: number;
    } = {}): Promise<ActivityResponse> {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
      const search = query.toString();
      const endpoint = `/api/dashboard/activity${search ? `?${search}` : ''}`;
      return api.request<{ data: ActivityResponse }>(endpoint)
        .then(res => (res as any).data ?? res) as Promise<ActivityResponse>;
    },

    acknowledgeAlert(alertId: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/dashboard/alerts/${alertId}/acknowledge`, { method: 'POST' });
    },

    resolveAlert(alertId: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/dashboard/alerts/${alertId}/resolve`, { method: 'POST' });
    },

    exportActivity(queryString: string): Promise<string> {
      return api.getText(`/api/dashboard/activity/export?${queryString}`);
    },

    exportAnalytics(queryString: string): Promise<string> {
      return api.getText(`/api/dashboard/analytics/export?${queryString}`);
    },

    // API Endpoint Monitoring
    getApiEndpointsStatus(): Promise<{
      overall: {
        status: 'healthy' | 'warning' | 'error';
        message: string;
        stats: {
          total: number;
          online: number;
          slow: number;
          offline: number;
          error: number;
        };
      };
      endpoints: Array<{
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'slow' | 'error';
        responseTime: number;
        lastChecked: string;
        lastSuccessfulCheck?: string;
        consecutiveFailures: number;
        totalChecks: number;
        successfulChecks: number;
        averageResponseTime: number;
        errorMessage?: string;
        statusCode?: number;
      }>;
      timestamp: string;
    }> {
      return api.request('/health/api-endpoints');
    },

    getApiEndpointStatus(id: string): Promise<{
      endpoint: {
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'slow' | 'error';
        responseTime: number;
        lastChecked: string;
        lastSuccessfulCheck?: string;
        consecutiveFailures: number;
        totalChecks: number;
        successfulChecks: number;
        averageResponseTime: number;
        errorMessage?: string;
        statusCode?: number;
      };
      timestamp: string;
    }> {
      return api.request(`/health/api-endpoints/${id}`);
    },

    addApiEndpoint(config: {
      id: string;
      name: string;
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
      headers?: Record<string, string>;
      body?: unknown;
      expectedStatusCodes?: number[];
      timeout?: number;
      interval?: number;
      enabled?: boolean;
      retries?: number;
      retryDelay?: number;
    }): Promise<{
      message: string;
      endpoint: {
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'slow' | 'error';
        responseTime: number;
        lastChecked: string;
        lastSuccessfulCheck?: string;
        consecutiveFailures: number;
        totalChecks: number;
        successfulChecks: number;
        averageResponseTime: number;
        errorMessage?: string;
        statusCode?: number;
      };
      timestamp: string;
    }> {
      return api.request('/health/api-endpoints', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },

    updateApiEndpoint(id: string, config: Partial<{
      name: string;
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
      headers: Record<string, string>;
      body: unknown;
      expectedStatusCodes: number[];
      timeout: number;
      interval: number;
      enabled: boolean;
      retries: number;
      retryDelay: number;
    }>): Promise<{
      message: string;
      endpoint: {
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'slow' | 'error';
        responseTime: number;
        lastChecked: string;
        lastSuccessfulCheck?: string;
        consecutiveFailures: number;
        totalChecks: number;
        successfulChecks: number;
        averageResponseTime: number;
        errorMessage?: string;
        statusCode?: number;
      };
      timestamp: string;
    }> {
      return api.request(`/health/api-endpoints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    removeApiEndpoint(id: string): Promise<{
      message: string;
      removedEndpoint: {
        id: string;
        name: string;
        url: string;
        status: 'online' | 'offline' | 'slow' | 'error';
        responseTime: number;
        lastChecked: string;
        lastSuccessfulCheck?: string;
        consecutiveFailures: number;
        totalChecks: number;
        successfulChecks: number;
        averageResponseTime: number;
        errorMessage?: string;
        statusCode?: number;
      };
      timestamp: string;
    }> {
      return api.request(`/health/api-endpoints/${id}`, { method: 'DELETE' });
    },

    startApiMonitoring(): Promise<{
      message: string;
      timestamp: string;
    }> {
      return api.request('/health/api-endpoints/start', { method: 'POST' });
    },

    stopApiMonitoring(): Promise<{
      message: string;
      timestamp: string;
    }> {
      return api.request('/health/api-endpoints/stop', { method: 'POST' });
    },

    // System Health
    getSystemHealth(): Promise<{
      status: string;
      timestamp: string;
      uptime: number;
      memory: {
        used: number;
        total: number;
        usage: number;
      };
      cpu: {
        user: number;
        system: number;
      };
      system: {
        platform: string;
        arch: string;
        release: string;
        hostname: string;
        loadAverage: number[];
      };
    }> {
      return api.request('/health/detailed');
    },

    getServiceHealth(): Promise<{
      services: Array<{
        name: string;
        status: 'healthy' | 'degraded' | 'down';
        latencyMs: number;
        lastChecked: string;
        details: string;
      }>;
    }> {
      return api.request('/health/detailed/services');
    },

    getAnomalies(): Promise<{ success: boolean; data: { anomalies: any[] } }> {
      // Route is mounted at /api/admin/anomalies (admin/monitoring.ts router is
      // mounted at '/'); the '/monitoring/' segment 404s.
      return api.request('/api/admin/anomalies');
    },

    getCostAnalytics(days: number = 7): Promise<{ 
      success: boolean; 
      data: { 
        historical: any[]; 
        daily: { date: string, cost: number }[];
        summary: { totalCost: number, days: number } 
      } 
    }> {
      return api.request(`/api/monitoring/costs?days=${days}`);
    },
  };
}
