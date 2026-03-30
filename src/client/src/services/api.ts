import { BaseApiClient } from './api/baseRequest';
export * from '../types/api';
import {
  ConfigResponse,
  StatusResponse,
  ConfigSourcesResponse,
  Bot,
  ProviderConfig,
  Persona,
  SecureConfig,
  ActivityResponse,
} from '../types/api';

class ApiService extends BaseApiClient {
  // Domain groupings
  public bots = {
    getAll: (): Promise<any[]> => this.get('/api/bots'),
    getHistory: (botId: string, limit: number = 20): Promise<any[]> =>
      this.get<{ success: boolean; data: { history: any[] } }>(`/api/bots/${botId}/history?limit=${limit}`).then(res => res.data?.history || []),
    create: (botData: {
      name: string;
      messageProvider: string;
      llmProvider?: string;
      config?: ProviderConfig;
    }): Promise<{ success: boolean; message: string; bot: Bot }> => {
      const payload = { ...botData, ...(botData.llmProvider ? {} : { llmProvider: undefined }) };
      return this.post('/api/bots', payload);
    },
    update: (botId: string, updates: {
      name?: string;
      messageProvider?: string;
      llmProvider?: string;
      persona?: string;
      systemInstruction?: string;
      config?: ProviderConfig;
    }): Promise<{ success: boolean; message: string; bot: Bot }> => this.put(`/api/bots/${botId}`, updates),
    clone: (name: string, newName: string): Promise<{ success: boolean; message: string; bot: Bot }> => this.post(`/api/bots/${name}/clone`, { newName }),
    delete: (name: string): Promise<{ success: boolean; message: string }> => this.delete(`/api/bots/${name}`),
    start: (botId: string): Promise<{ success: boolean; message: string }> => this.post(`/api/bots/${botId}/start`),
    stop: (botId: string): Promise<{ success: boolean; message: string }> => this.post(`/api/bots/${botId}/stop`),
  };

  public config = {
    get: (): Promise<ConfigResponse> => this.get('/api/config'),
    getSources: (): Promise<ConfigSourcesResponse> => this.get('/api/config/sources'),
    getLlmProfiles: (): Promise<any> => this.get('/api/config/llm-profiles'),
    reload: (): Promise<{ success: boolean; message: string; timestamp: string }> => this.post('/api/config/reload'),
    getGlobal: (): Promise<Record<string, any>> => this.get('/api/config/global'),
    updateGlobal: (updates: Record<string, any>): Promise<{ success: boolean; message: string }> => this.put('/api/config/global', updates),
    export: (): Promise<Blob> => {
      const headers = this.getAuthHeaders();
      headers['Accept'] = 'application/json';
      return fetch(this.buildUrl('/api/config/export'), { method: 'GET', headers }).then(res => {
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        return res.blob();
      });
    },
  };

  public personas = {
    getAll: (): Promise<Persona[]> => this.get('/api/personas'),
    get: (id: string): Promise<Persona> => this.get(`/api/personas/${id}`),
    create: (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>): Promise<Persona> => this.post('/api/personas', data),
    update: (id: string, data: Partial<Persona>): Promise<Persona> => this.put(`/api/personas/${id}`, data),
    clone: (id: string, overrides?: Partial<Persona>): Promise<Persona> => this.post(`/api/personas/${id}/clone`, overrides),
    delete: (id: string): Promise<{ success: boolean }> => this.delete(`/api/personas/${id}`),
  };

  public secureConfigs = {
    getAll: (): Promise<{ configs: SecureConfig[] }> => this.get('/api/secure-configs'),
    get: (name: string): Promise<{ config: SecureConfig }> => this.get(`/api/secure-configs/${name}`),
    save: (name: string, data: Record<string, unknown>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> =>
      this.post('/api/secure-configs', { name, data, encryptSensitive }),
    delete: (name: string): Promise<{ success: boolean; message: string }> => this.delete(`/api/secure-configs/${name}`),
    backup: (): Promise<{ success: boolean; message: string; backupFile: string }> => this.post('/api/secure-configs/backup'),
    restore: (backupFile: string): Promise<{ success: boolean; message: string }> => this.post('/api/secure-configs/restore', { backupFile }),
    getInfo: (): Promise<{ configDirectory: string; totalConfigs: number; directorySize: number; lastModified: string; }> => this.get('/api/secure-configs/info'),
  };

  public health = {
    getStatus: (): Promise<StatusResponse> => this.get('/api/dashboard/status'),
    getApiEndpointsStatus: (): Promise<any> => this.get('/health/api-endpoints'),
    getApiEndpointStatus: (id: string): Promise<any> => this.get(`/health/api-endpoints/${id}`),
    addApiEndpoint: (config: any): Promise<any> => this.post('/health/api-endpoints', config),
    updateApiEndpoint: (id: string, config: any): Promise<any> => this.put(`/health/api-endpoints/${id}`, config),
    removeApiEndpoint: (id: string): Promise<any> => this.delete(`/health/api-endpoints/${id}`),
    startApiMonitoring: (): Promise<any> => this.post('/health/api-endpoints/start'),
    stopApiMonitoring: (): Promise<any> => this.post('/health/api-endpoints/stop'),
    getSystemHealth: (): Promise<any> => this.get('/health/detailed'),
    getServiceHealth: (): Promise<any> => this.get('/health/detailed/services'),
  };

  public activity = {
    get: (params: Record<string, any> = {}): Promise<ActivityResponse> => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
      });
      const search = query.toString();
      return this.get(`/api/dashboard/activity${search ? `?${search}` : ''}`);
    },
    exportActivity: (queryString: string): Promise<string> => {
      return fetch(this.buildUrl(`/api/dashboard/activity/export?${queryString}`), { method: 'GET', headers: this.getAuthHeaders() }).then(res => {
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        return res.text();
      });
    },
    exportAnalytics: (queryString: string): Promise<string> => {
      return fetch(this.buildUrl(`/api/dashboard/analytics/export?${queryString}`), { method: 'GET', headers: this.getAuthHeaders() }).then(res => {
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        return res.text();
      });
    },
  };

  public alerts = {
    acknowledge: (alertId: string): Promise<{ success: boolean; message: string }> => this.post(`/api/dashboard/alerts/${alertId}/acknowledge`),
    resolve: (alertId: string): Promise<{ success: boolean; message: string }> => this.post(`/api/dashboard/alerts/${alertId}/resolve`),
  };

  public backups = {
    list: (): Promise<any[]> => this.get<{ success: boolean; data: any[] }>('/api/import-export/backups').then(res => res.data || []),
    create: (options: any): Promise<{ success: boolean; message: string; data: any }> => this.post('/api/import-export/backup', options),
    restore: (backupId: string, options: any = {}): Promise<{ success: boolean; message: string }> => this.post(`/api/import-export/backups/${backupId}/restore`, options),
    delete: (backupId: string): Promise<{ success: boolean; message: string }> => this.delete(`/api/import-export/backups/${backupId}`),
    download: (backupId: string): Promise<Blob> => {
      return fetch(this.buildUrl(`/api/import-export/backups/${backupId}/download`), { method: 'GET', headers: this.getAuthHeaders() }).then(res => {
        if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
        return res.blob();
      });
    },
  };

  public admin = {
    getSystemInfo: (): Promise<any> => this.get('/api/admin/system-info'),
    getEnvOverrides: (): Promise<any> => this.get('/api/admin/env-overrides'),
  };

  public cache = {
    clear: (): Promise<{ success: boolean; message: string }> => this.post('/api/cache/clear'),
  };

  private buildUrl(endpoint: string): string {
    // Used specifically inside fetch overrides that bypass base client
    const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV);
    const API_BASE_URL = (typeof process !== 'undefined' ? process.env.VITE_API_BASE_URL : (import.meta as any).env?.VITE_API_BASE_URL)?.replace(/\/$/, '') || '';
    if (!API_BASE_URL && isDev) return endpoint;
    return `${API_BASE_URL}${endpoint}`;
  }

  // Legacy flat methods mapping for backward compatibility
  async getConfig(): Promise<ConfigResponse> { return this.config.get(); }
  async getStatus(): Promise<StatusResponse> { return this.health.getStatus(); }
  async getConfigSources(): Promise<ConfigSourcesResponse> { return this.config.getSources(); }
  async getLlmProfiles(): Promise<any> { return this.config.getLlmProfiles(); }
  async reloadConfig(): Promise<{ success: boolean; message: string; timestamp: string }> { return this.config.reload(); }
  async getBots(): Promise<any[]> { return this.bots.getAll(); }
  async getBotHistory(botId: string, limit: number = 20): Promise<any[]> { return this.bots.getHistory(botId, limit); }
  async createBot(botData: any): Promise<any> { return this.bots.create(botData); }
  async updateBot(botId: string, updates: any): Promise<any> { return this.bots.update(botId, updates); }
  async cloneBot(name: string, newName: string): Promise<any> { return this.bots.clone(name, newName); }
  async deleteBot(name: string): Promise<any> { return this.bots.delete(name); }
  async getPersonas(): Promise<Persona[]> { return this.personas.getAll(); }
  async getPersona(id: string): Promise<Persona> { return this.personas.get(id); }
  async createPersona(data: any): Promise<Persona> { return this.personas.create(data); }
  async updatePersona(id: string, data: any): Promise<Persona> { return this.personas.update(id, data); }
  async clonePersona(id: string, overrides?: any): Promise<Persona> { return this.personas.clone(id, overrides); }
  async deletePersona(id: string): Promise<{ success: boolean }> { return this.personas.delete(id); }
  async getSecureConfigs(): Promise<any> { return this.secureConfigs.getAll(); }
  async getSecureConfig(name: string): Promise<any> { return this.secureConfigs.get(name); }
  async saveSecureConfig(name: string, data: any, encryptSensitive = true): Promise<any> { return this.secureConfigs.save(name, data, encryptSensitive); }
  async deleteSecureConfig(name: string): Promise<any> { return this.secureConfigs.delete(name); }
  async backupSecureConfigs(): Promise<any> { return this.secureConfigs.backup(); }
  async restoreSecureConfigs(backupFile: string): Promise<any> { return this.secureConfigs.restore(backupFile); }
  async getSecureConfigInfo(): Promise<any> { return this.secureConfigs.getInfo(); }
  async getActivity(params: any = {}): Promise<ActivityResponse> { return this.activity.get(params); }
  async clearCache(): Promise<any> { return this.cache.clear(); }
  async exportConfig(): Promise<Blob> { return this.config.export(); }
  async getApiEndpointsStatus(): Promise<any> { return this.health.getApiEndpointsStatus(); }
  async getApiEndpointStatus(id: string): Promise<any> { return this.health.getApiEndpointStatus(id); }
  async addApiEndpoint(config: any): Promise<any> { return this.health.addApiEndpoint(config); }
  async updateApiEndpoint(id: string, config: any): Promise<any> { return this.health.updateApiEndpoint(id, config); }
  async removeApiEndpoint(id: string): Promise<any> { return this.health.removeApiEndpoint(id); }
  async startApiMonitoring(): Promise<any> { return this.health.startApiMonitoring(); }
  async stopApiMonitoring(): Promise<any> { return this.health.stopApiMonitoring(); }
  async getSystemHealth(): Promise<any> { return this.health.getSystemHealth(); }
  async getServiceHealth(): Promise<any> { return this.health.getServiceHealth(); }
  async getGlobalConfig(): Promise<any> { return this.config.getGlobal(); }
  async updateGlobalConfig(updates: any): Promise<any> { return this.config.updateGlobal(updates); }
  async acknowledgeAlert(alertId: string): Promise<any> { return this.alerts.acknowledge(alertId); }
  async resolveAlert(alertId: string): Promise<any> { return this.alerts.resolve(alertId); }
  async listSystemBackups(): Promise<any[]> { return this.backups.list(); }
  async createSystemBackup(options: any): Promise<any> { return this.backups.create(options); }
  async restoreSystemBackup(backupId: string, options: any = {}): Promise<any> { return this.backups.restore(backupId, options); }
  async deleteSystemBackup(backupId: string): Promise<any> { return this.backups.delete(backupId); }
  async downloadSystemBackup(backupId: string): Promise<Blob> { return this.backups.download(backupId); }
  async getSystemInfo(): Promise<any> { return this.admin.getSystemInfo(); }
  async getEnvOverrides(): Promise<any> { return this.admin.getEnvOverrides(); }
  async startBot(botId: string): Promise<any> { return this.bots.start(botId); }
  async stopBot(botId: string): Promise<any> { return this.bots.stop(botId); }
  async exportActivity(queryString: string): Promise<string> { return this.activity.exportActivity(queryString); }
  async exportAnalytics(queryString: string): Promise<string> { return this.activity.exportAnalytics(queryString); }
}

export const apiService = new ApiService();
