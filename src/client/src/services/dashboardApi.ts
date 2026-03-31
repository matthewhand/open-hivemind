import { baseClient, buildUrl } from './baseClient';
import type { StatusResponse, ActivityResponse } from './apiTypes';

export const dashboardApi = {
  getStatus: async (): Promise<StatusResponse> => {
    return baseClient.get<StatusResponse>('/api/dashboard/status');
  },

  getActivity: async (params: {
    bot?: string;
    messageProvider?: string;
    llmProvider?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<ActivityResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const search = query.toString();
    const endpoint = `/api/dashboard/activity${search ? `?${search}` : ''}`;
    return baseClient.get<ActivityResponse>(endpoint);
  },

  acknowledgeAlert: async (alertId: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.post(`/api/dashboard/alerts/${alertId}/acknowledge`);
  },

  resolveAlert: async (alertId: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.post(`/api/dashboard/alerts/${alertId}/resolve`);
  },

  exportActivity: async (queryString: string): Promise<string> => {
    const url = buildUrl(`/api/dashboard/activity/export?${queryString}`);
    const headers = baseClient.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.text();
  },

  exportAnalytics: async (queryString: string): Promise<string> => {
    const url = buildUrl(`/api/dashboard/analytics/export?${queryString}`);
    const headers = baseClient.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.text();
  }
};
