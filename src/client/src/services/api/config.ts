/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService, buildUrl } from './core';
import type { ConfigResponse, ConfigSourcesResponse } from './types';

export function configMixin(api: ApiService) {
  return {
    getConfig(): Promise<ConfigResponse> {
      return api.request<ConfigResponse>('/api/config');
    },

    getConfigSources(): Promise<ConfigSourcesResponse> {
      return api.request<ConfigSourcesResponse>('/api/config/sources');
    },

    getLlmProfiles(): Promise<any> {
      return api.request<any>('/api/config/llm-profiles');
    },

    reloadConfig(): Promise<{ success: boolean; message: string; timestamp: string }> {
      return api.request('/api/config/reload', { method: 'POST' });
    },

    getGlobalConfig(): Promise<Record<string, any>> {
      return api.request('/api/config/global');
    },

    updateGlobalConfig(updates: Record<string, any>): Promise<{ success: boolean; message: string }> {
      return api.request('/api/config/global', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async exportConfig(): Promise<Blob> {
      const headers = api.getAuthHeaders();
      headers['Accept'] = 'application/json';

      const response = await fetch(buildUrl('/api/config/export'), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return response.blob();
    },
  };
}
