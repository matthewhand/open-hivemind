/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService } from './core';
import type { ActivityResponse, StatusResponse } from './types';

export function monitoringMixin(api: ApiService) {
  return {
    getStatus(): Promise<StatusResponse> {
      return api.request<StatusResponse>('/api/dashboard/status');
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
      return api.request<ActivityResponse>(endpoint);
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
  };
}
