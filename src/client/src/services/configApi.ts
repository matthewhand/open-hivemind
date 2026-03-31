import { baseClient } from './baseClient';
import { buildUrl } from './baseClient';
import type { ConfigResponse, ConfigSourcesResponse, SecureConfig } from './apiTypes';

export const configApi = {
  getConfig: async (): Promise<ConfigResponse> => {
    return baseClient.get<ConfigResponse>('/api/config');
  },

  getConfigSources: async (): Promise<ConfigSourcesResponse> => {
    return baseClient.get<ConfigSourcesResponse>('/api/config/sources');
  },

  getLlmProfiles: async (): Promise<any> => {
    return baseClient.get<any>('/api/config/llm-profiles');
  },

  reloadConfig: async (): Promise<{ success: boolean; message: string; timestamp: string }> => {
    return baseClient.post('/api/config/reload');
  },

  exportConfig: async (): Promise<Blob> => {
    const headers = baseClient.getAuthHeaders();
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

  clearCache: async (): Promise<{ success: boolean; message: string }> => {
    return baseClient.post('/api/cache/clear');
  },

  getSecureConfigs: async (): Promise<{ configs: SecureConfig[] }> => {
    return baseClient.get('/api/secure-configs');
  },

  getSecureConfig: async (name: string): Promise<{ config: SecureConfig }> => {
    return baseClient.get(`/api/secure-configs/${name}`);
  },

  saveSecureConfig: async (name: string, data: Record<string, unknown>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> => {
    return baseClient.post('/api/secure-configs', { name, data, encryptSensitive });
  },

  deleteSecureConfig: async (name: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.delete(`/api/secure-configs/${name}`);
  },

  backupSecureConfigs: async (): Promise<{ success: boolean; message: string; backupFile: string }> => {
    return baseClient.post('/api/secure-configs/backup');
  },

  restoreSecureConfigs: async (backupFile: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.post('/api/secure-configs/restore', { backupFile });
  },

  getSecureConfigInfo: async (): Promise<{
    configDirectory: string;
    totalConfigs: number;
    directorySize: number;
    lastModified: string;
  }> => {
    return baseClient.get('/api/secure-configs/info');
  },

  getGlobalConfig: async (): Promise<Record<string, any>> => {
    return baseClient.get('/api/config/global');
  },

  updateGlobalConfig: async (updates: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    return baseClient.put('/api/config/global', updates);
  }
};
