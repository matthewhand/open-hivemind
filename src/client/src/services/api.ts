const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface FieldMetadata {
  source: 'env' | 'user' | 'default';
  locked: boolean;
  envVar?: string;
  override?: boolean;
}

export interface BotMetadata {
  messageProvider?: FieldMetadata;
  llmProvider?: FieldMetadata;
  persona?: FieldMetadata;
  systemInstruction?: FieldMetadata;
  mcpServers?: FieldMetadata;
  mcpGuard?: FieldMetadata;
}

export interface Bot {
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: Array<{ name: string; serverUrl?: string }> | string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  discord?: any;
  slack?: any;
  mattermost?: any;
  openai?: any;
  flowise?: any;
  openwebui?: any;
  openswarm?: any;
  perplexity?: any;
  replicate?: any;
  n8n?: any;
  metadata?: BotMetadata;
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

export interface HotReloadRequest {
  type: 'create' | 'update' | 'delete';
  botName?: string;
  changes: Record<string, unknown>;
}

export interface HotReloadResponse {
  success: boolean;
  message: string;
  affectedBots: string[];
  warnings: string[];
  errors: string[];
  rollbackId?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

export interface ActivityTimelineBucket {
  timestamp: string;
  messageProviders: Record<string, number>;
  llmProviders: Record<string, number>;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  filters: {
    agents: string[];
    messageProviders: string[];
    llmProviders: string[];
  };
  timeline: ActivityTimelineBucket[];
  agentMetrics: Array<{
    botName: string;
    messageProvider: string;
    llmProvider: string;
    events: number;
    errors: number;
    lastActivity: string;
    totalMessages: number;
    recentErrors: string[];
  }>;
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

  async updateBot(botId: string, updates: {
    name?: string;
    messageProvider?: string;
    llmProvider?: string;
    persona?: string;
    systemInstruction?: string;
    config?: any;
  }): Promise<{ success: boolean; message: string; bot: Bot }> {
    return this.request(`/webui/api/bots/${botId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
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

  async getBotActivity(botId: string, options: {
    limit?: number;
    startTime?: string;
    endTime?: string;
  } = {}): Promise<{
    success: boolean;
    data: {
      botId: string;
      events: ActivityEvent[];
      total: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.startTime) params.append('startTime', options.startTime);
    if (options.endTime) params.append('endTime', options.endTime);

    const query = params.toString();
    return this.request(`/webui/api/bots/${botId}/activity${query ? `?${query}` : ''}`);
  }

  async getActivitySummary(limit: number = 100): Promise<{
    success: boolean;
    data: {
      summary: Array<{
        name: string;
        totalEvents: number;
        successCount: number;
        errorCount: number;
        lastActivity: string | null;
        messageCount: number;
      }>;
      totalEvents: number;
    };
  }> {
    return this.request(`/webui/api/bots/activity/summary?limit=${limit}`);
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

  async getActivity(params: {
    bot?: string;
    messageProvider?: string;
    llmProvider?: string;
    from?: string;
    to?: string;
  } = {}): Promise<ActivityResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const search = query.toString();
    const endpoint = `/dashboard/api/activity${search ? `?${search}` : ''}`;
    return this.request<ActivityResponse>(endpoint);
  }

  async clearCache(): Promise<{ success: boolean; message: string }> {
    return this.request('/webui/api/cache/clear', { method: 'POST' });
  }

  async exportConfig(): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/webui/api/config/export`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // API Monitoring Methods
  async getApiEndpointsStatus(): Promise<{
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
    return this.request('/health/api-endpoints');
  }

  async getApiEndpointStatus(id: string): Promise<{
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
    return this.request(`/health/api-endpoints/${id}`);
  }

  async addApiEndpoint(config: {
    id: string;
    name: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
    headers?: Record<string, string>;
    body?: any;
    expectedStatusCodes?: number[];
    timeout?: number;
    interval?: number;
    enabled?: boolean;
    retries?: number;
    retryDelay?: number;
  }): Promise<{
    message: string;
    endpoint: any;
    timestamp: string;
  }> {
    return this.request('/health/api-endpoints', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async updateApiEndpoint(id: string, config: Partial<{
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
    headers: Record<string, string>;
    body: any;
    expectedStatusCodes: number[];
    timeout: number;
    interval: number;
    enabled: boolean;
    retries: number;
    retryDelay: number;
  }>): Promise<{
    message: string;
    endpoint: any;
    timestamp: string;
  }> {
    return this.request(`/health/api-endpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async removeApiEndpoint(id: string): Promise<{
    message: string;
    removedEndpoint: any;
    timestamp: string;
  }> {
    return this.request(`/health/api-endpoints/${id}`, { method: 'DELETE' });
  }

  async startApiMonitoring(): Promise<{
    message: string;
    timestamp: string;
  }> {
    return this.request('/health/api-endpoints/start', { method: 'POST' });
  }

  async stopApiMonitoring(): Promise<{
    message: string;
    timestamp: string;
  }> {
    return this.request('/health/api-endpoints/stop', { method: 'POST' });
  }

  async getSystemHealth(): Promise<{
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
    return this.request('/health/detailed');
  }
}

export const apiService = new ApiService();
