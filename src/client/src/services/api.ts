const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

const buildUrl = (endpoint: string): string => {
  if (!API_BASE_URL) {
    return endpoint;
  }
  return `${API_BASE_URL}${endpoint}`;
};

// Mock data for demo mode
const mockConfigResponse = {
  bots: [
    {
      name: "Demo Bot",
      messageProvider: "discord",
      llmProvider: "openai",
      persona: "helpful-assistant",
      systemInstruction: "You are a helpful assistant",
      discord: { channelId: "demo-channel" }
    }
  ],
  warnings: ["Running in demo mode - no backend connection"],
  legacyMode: false,
  environment: "production"
};

const mockStatusResponse = {
  bots: [
    {
      name: "Demo Bot",
      provider: "discord",
      llmProvider: "openai",
      status: "online",
      connected: true,
      messageCount: 42,
      errorCount: 0
    }
  ],
  uptime: 86400
};

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

// Provider-specific configuration interfaces
export interface DiscordConfig {
  channelId?: string;
  guildId?: string;
  token?: string;
  prefix?: string;
  intents?: string[];
}

export interface SlackConfig {
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
  teamId?: string;
  channels?: string[];
}

export interface MattermostConfig {
  url?: string;
  accessToken?: string;
  teamId?: string;
  channelId?: string;
}

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  organization?: string;
}

export interface FlowiseConfig {
  apiUrl?: string;
  apiKey?: string;
  chatflowId?: string;
}

export interface OpenWebUIConfig {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface OpenSwarmConfig {
  apiUrl?: string;
  apiKey?: string;
  swarmId?: string;
}

export interface PerplexityConfig {
  apiKey?: string;
  model?: string;
}

export interface ReplicateConfig {
  apiKey?: string;
  model?: string;
  version?: string;
}

export interface N8nConfig {
  apiUrl?: string;
  apiKey?: string;
  workflowId?: string;
}

// Union type for all provider configs
export type ProviderConfig =
  | DiscordConfig
  | SlackConfig
  | MattermostConfig
  | OpenAIConfig
  | FlowiseConfig
  | OpenWebUIConfig
  | OpenSwarmConfig
  | PerplexityConfig
  | ReplicateConfig
  | N8nConfig;

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
  discord?: DiscordConfig;
  slack?: SlackConfig;
  mattermost?: MattermostConfig;
  openai?: OpenAIConfig;
  flowise?: FlowiseConfig;
  openwebui?: OpenWebUIConfig;
  openswarm?: OpenSwarmConfig;
  perplexity?: PerplexityConfig;
  replicate?: ReplicateConfig;
  n8n?: N8nConfig;
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

export interface ConfigFile {
  path: string;
  size: number;
  lastModified: string;
  exists: boolean;
}

export interface ConfigOverride {
  key: string;
  value: unknown;
  source: 'cli' | 'env' | 'file';
  timestamp: string;
}

export interface ConfigSourcesResponse {
  environmentVariables: Record<string, string>;
  configFiles: ConfigFile[];
  overrides: ConfigOverride[];
}

export interface SecureConfig {
  id: string;
  name: string;
  data: Record<string, unknown>;
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
    const url = buildUrl(endpoint);

    try {
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
    } catch (error) {
      // Log error with proper typing
      const errorMessage = error instanceof Error ? error.message : String(error);
      const typedError = error as { response?: { status?: number } };

      if (process.env.NODE_ENV === 'development') {
        console.warn(`API request failed for ${endpoint}, using mock data:`, {
          message: errorMessage,
          status: typedError.response?.status,
          endpoint
        });
      }

      // Return mock data for specific endpoints
      if (endpoint.includes('/config')) {
        return mockConfigResponse as T;
      } else if (endpoint.includes('/status')) {
        return mockStatusResponse as T;
      } else if (endpoint.includes('/activity')) {
        return {
          events: [],
          filters: { agents: [], messageProviders: [], llmProviders: [] },
          timeline: [],
          agentMetrics: []
        } as T;
      } else {
        // Return empty/default responses for other endpoints
        return { success: false, message: 'Demo mode - backend not available' } as T;
      }
    }
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
    config?: ProviderConfig;
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
    config?: ProviderConfig;
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

  // Secure Configuration Methods
  async getSecureConfigs(): Promise<{ configs: SecureConfig[] }> {
    return this.request('/webui/api/secure-configs');
  }

  async getSecureConfig(name: string): Promise<{ config: SecureConfig }> {
    return this.request(`/webui/api/secure-configs/${name}`);
  }

  async saveSecureConfig(name: string, data: Record<string, unknown>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> {
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
    const response = await fetch(buildUrl('/webui/api/config/export'), {
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
    return this.request(`/health/api-endpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async removeApiEndpoint(id: string): Promise<{
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
