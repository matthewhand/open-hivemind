const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface Bot {
  name: string;
  messageProvider: string;
  llmProvider: string;
  discord?: any;
  slack?: any;
  openai?: any;
  flowise?: any;
  openwebui?: any;
  openswarm?: any;
}

export interface ConfigResponse {
  bots: Bot[];
  warnings: string[];
  legacyMode: boolean;
  environment: string;
}

export interface StatusResponse {
  bots: Array<{
    name: string;
    provider: string;
    llmProvider: string;
    status: string;
    healthDetails?: any;
    connected?: boolean;
    messageCount?: number;
    errorCount?: number;
  }>;
  uptime: number;
}

export interface ConfigSourcesResponse {
  environmentVariables: Record<string, any>;
  configFiles: any[];
  overrides: any[];
}

export interface SecureConfig {
  id: string;
  name: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/webui/api/config');
  }

  async getStatus(): Promise<StatusResponse> {
    return this.request<StatusResponse>('/dashboard/api/status');
  }

  async getConfigSources(): Promise<ConfigSourcesResponse> {
    return this.request<ConfigSourcesResponse>('/webui/api/config/sources');
  }

  async reloadConfig(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.request('/webui/api/config/reload', { method: 'POST' });
  }

  async createBot(botData: {
    name: string;
    messageProvider: string;
    llmProvider: string;
    config?: any;
  }): Promise<{ success: boolean; message: string; bot: Bot }> {
    return this.request('/webui/api/bots', {
      method: 'POST',
      body: JSON.stringify(botData)
    });
  }

  async cloneBot(name: string, newName: string): Promise<{ success: boolean; message: string; bot: Bot }> {
    return this.request(`/webui/api/bots/${name}/clone`, {
      method: 'POST',
      body: JSON.stringify({ newName })
    });
  }

  async deleteBot(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/webui/api/bots/${name}`, { method: 'DELETE' });
  }

  // Secure Configuration Methods
  async getSecureConfigs(): Promise<{ configs: SecureConfig[] }> {
    return this.request('/webui/api/secure-configs');
  }

  async getSecureConfig(name: string): Promise<{ config: SecureConfig }> {
    return this.request(`/webui/api/secure-configs/${name}`);
  }

  async saveSecureConfig(name: string, data: Record<string, any>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> {
    return this.request('/webui/api/secure-configs', {
      method: 'POST',
      body: JSON.stringify({ name, data, encryptSensitive })
    });
  }

  async deleteSecureConfig(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/webui/api/secure-configs/${name}`, { method: 'DELETE' });
  }

  async backupSecureConfigs(): Promise<{ success: boolean; message: string; backupFile: string }> {
    return this.request('/webui/api/secure-configs/backup', { method: 'POST' });
  }

  async restoreSecureConfigs(backupFile: string): Promise<{ success: boolean; message: string }> {
    return this.request('/webui/api/secure-configs/restore', {
      method: 'POST',
      body: JSON.stringify({ backupFile })
    });
  }

  async getSecureConfigInfo(): Promise<{
    configDirectory: string;
    totalConfigs: number;
    directorySize: number;
    lastModified: string;
  }> {
    return this.request('/webui/api/secure-configs/info');
  }
}

export const apiService = new ApiService();
