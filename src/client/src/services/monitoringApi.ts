import { baseClient } from './baseClient';

export const monitoringApi = {
  getApiEndpointsStatus: async (): Promise<{
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
  }> => {
    return baseClient.get('/health/api-endpoints');
  },

  getApiEndpointStatus: async (id: string): Promise<{
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
  }> => {
    return baseClient.get(`/health/api-endpoints/${id}`);
  },

  addApiEndpoint: async (config: {
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
  }> => {
    return baseClient.post('/health/api-endpoints', config);
  },

  updateApiEndpoint: async (id: string, config: Partial<{
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
  }> => {
    return baseClient.put(`/health/api-endpoints/${id}`, config);
  },

  removeApiEndpoint: async (id: string): Promise<{
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
  }> => {
    return baseClient.delete(`/health/api-endpoints/${id}`);
  },

  startApiMonitoring: async (): Promise<{
    message: string;
    timestamp: string;
  }> => {
    return baseClient.post('/health/api-endpoints/start');
  },

  stopApiMonitoring: async (): Promise<{
    message: string;
    timestamp: string;
  }> => {
    return baseClient.post('/health/api-endpoints/stop');
  },

  getSystemHealth: async (): Promise<{
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
  }> => {
    return baseClient.get('/health/detailed');
  },

  getServiceHealth: async (): Promise<{
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      latencyMs: number;
      lastChecked: string;
      details: string;
    }>;
  }> => {
    return baseClient.get('/health/detailed/services');
  }
};
