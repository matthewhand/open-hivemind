import { ApiClient, buildUrl } from './api/client';

class ApiService extends ApiClient {
  public bots = {
    getBots: () => this.get<any[]>('/api/bots'),
    getBotHistory: async (botId: string, limit: number = 20) => {
      const res = await this.get<{ success: boolean; data: { history: any[] } }>(`/api/bots/${botId}/history?limit=${limit}`);
      return res.data?.history || [];
    },
    createBot: (botData: any) => {
      const payload = { ...botData, ...(botData.llmProvider ? {} : { llmProvider: undefined }) };
      return this.post<{ success: boolean; message: string; bot: any }>('/api/bots', payload);
    },
    updateBot: (botId: string, updates: any) => this.put<{ success: boolean; message: string; bot: any }>(`/api/bots/${botId}`, updates),
    cloneBot: (name: string, newName: string) => this.post<{ success: boolean; message: string; bot: any }>(`/api/bots/${name}/clone`, { newName }),
    deleteBot: (name: string) => this.delete<{ success: boolean; message: string }>(`/api/bots/${name}`),
    startBot: (botId: string) => this.post<{ success: boolean; message: string }>(`/api/bots/${botId}/start`),
    stopBot: (botId: string) => this.post<{ success: boolean; message: string }>(`/api/bots/${botId}/stop`),
  };

  public personas = {
    getPersonas: () => this.get<any[]>('/api/personas'),
    getPersona: (id: string) => this.get<any>(`/api/personas/${id}`),
    createPersona: (data: any) => this.post<any>('/api/personas', data),
    updatePersona: (id: string, data: any) => this.put<any>(`/api/personas/${id}`, data),
    clonePersona: (id: string, overrides?: any) => this.post<any>(`/api/personas/${id}/clone`, overrides),
    deletePersona: (id: string) => this.delete<{ success: boolean }>(`/api/personas/${id}`),
  };

  public config = {
    getConfig: () => this.get<any>('/api/config'),
    getConfigSources: () => this.get<any>('/api/config/sources'),
    getLlmProfiles: () => this.get<any>('/api/config/llm-profiles'),
    reloadConfig: () => this.post<{ success: boolean; message: string; timestamp: string }>('/api/config/reload'),
    getGlobalConfig: () => this.get<Record<string, any>>('/api/config/global'),
    updateGlobalConfig: (updates: Record<string, any>) => this.put<{ success: boolean; message: string }>('/api/config/global', updates),
    exportConfig: async () => {
      const url = `${this.buildUrl('/api/config/export')}`;
      const headers = this.getAuthHeaders();
      headers['Accept'] = 'application/json';
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      return response.blob();
    },
    clearCache: () => this.post<{ success: boolean; message: string }>('/api/cache/clear'),
  };

  public secureConfigs = {
    getSecureConfigs: () => this.get<{ configs: any[] }>('/api/secure-configs'),
    getSecureConfig: (name: string) => this.get<{ config: any }>(`/api/secure-configs/${name}`),
    saveSecureConfig: (name: string, data: Record<string, unknown>, encryptSensitive = true) => this.post<{ success: boolean; message: string; config: any }>('/api/secure-configs', { name, data, encryptSensitive }),
    deleteSecureConfig: (name: string) => this.delete<{ success: boolean; message: string }>(`/api/secure-configs/${name}`),
    backupSecureConfigs: () => this.post<{ success: boolean; message: string; backupFile: string }>('/api/secure-configs/backup'),
    restoreSecureConfigs: (backupFile: string) => this.post<{ success: boolean; message: string }>('/api/secure-configs/restore', { backupFile }),
    getSecureConfigInfo: () => this.get<{ configDirectory: string; totalConfigs: number; directorySize: number; lastModified: string }>('/api/secure-configs/info'),
  };

  public dashboard = {
    getStatus: () => this.get<any>('/api/dashboard/status'),
    getActivity: (params: any = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
      const search = query.toString();
      return this.get<any>(`/api/dashboard/activity${search ? `?${search}` : ''}`);
    },
    exportActivity: async (queryString: string) => {
      const url = this.buildUrl(`/api/dashboard/activity/export?${queryString}`);
      const headers = this.getAuthHeaders();
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      return response.text();
    },
    exportAnalytics: async (queryString: string) => {
      const url = this.buildUrl(`/api/dashboard/analytics/export?${queryString}`);
      const headers = this.getAuthHeaders();
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
      return response.text();
    },
    acknowledgeAlert: (alertId: string) => this.post<{ success: boolean; message: string }>(`/api/dashboard/alerts/${alertId}/acknowledge`),
    resolveAlert: (alertId: string) => this.post<{ success: boolean; message: string }>(`/api/dashboard/alerts/${alertId}/resolve`),
  };

  public health = {
    getApiEndpointsStatus: () => this.get<any>('/health/api-endpoints'),
    getApiEndpointStatus: (id: string) => this.get<any>(`/health/api-endpoints/${id}`),
    addApiEndpoint: (config: any) => this.post<any>('/health/api-endpoints', config),
    updateApiEndpoint: (id: string, config: any) => this.put<any>(`/health/api-endpoints/${id}`, config),
    removeApiEndpoint: (id: string) => this.delete<any>(`/health/api-endpoints/${id}`),
    startApiMonitoring: () => this.post<any>('/health/api-endpoints/start'),
    stopApiMonitoring: () => this.post<any>('/health/api-endpoints/stop'),
    getSystemHealth: () => this.get<any>('/health/detailed'),
    getServiceHealth: () => this.get<any>('/health/detailed/services'),
  };

  public importExport = {
    listSystemBackups: async () => {
      const res = await this.get<{ success: boolean; data: any[] }>('/api/import-export/backups');
      return res.data || [];
    },
    createSystemBackup: (options: any) => this.post<{ success: boolean; message: string; data: any }>('/api/import-export/backup', options),
    restoreSystemBackup: (backupId: string, options: any = {}) => this.post<{ success: boolean; message: string }>(`/api/import-export/backups/${backupId}/restore`, options),
    deleteSystemBackup: (backupId: string) => this.delete<{ success: boolean; message: string }>(`/api/import-export/backups/${backupId}`),
    downloadSystemBackup: async (backupId: string) => {
      const url = this.buildUrl(`/api/import-export/backups/${backupId}/download`);
      const headers = this.getAuthHeaders();
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      return response.blob();
    },
  };

  public admin = {
    getSystemInfo: () => this.get<any>('/api/admin/system-info'),
    getEnvOverrides: () => this.get<any>('/api/admin/env-overrides'),
  };

  public buildUrl(endpoint: string): string {
    return buildUrl(endpoint);
  }
}

export const apiService = new ApiService();
export * from './api/types';
