/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

const buildUrl = (endpoint: string): string => {
  // In development, if no API_BASE_URL is set, use relative URLs for local backend
  if (!API_BASE_URL && import.meta.env.DEV) {
    return endpoint;
  }

  // Use the env var if set, otherwise default to empty string (relative path)
  // This allows the Netlify redirect to handle the proxying to the backend
  const baseUrl = API_BASE_URL || '';
  return `${baseUrl}${endpoint}`;
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
  llmProfile?: FieldMetadata;
  responseProfile?: FieldMetadata;
  persona?: FieldMetadata;
  systemInstruction?: FieldMetadata;
  mcpServers?: FieldMetadata;
  mcpGuard?: FieldMetadata;
  mcpGuardProfile?: FieldMetadata;
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

export interface Persona {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'customer_service' | 'creative' | 'technical' | 'educational' | 'entertainment' | 'professional';
  traits: Array<{ name: string; value: string; weight?: number; type?: string }>;
  systemPrompt: string;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
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
  llmProfile?: string;
  responseProfile?: string;
  mcpGuardProfile?: string;
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
  public async get<T>(endpoint: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  private async request<T>(endpoint: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const url = buildUrl(endpoint);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options?.timeout || 15000); // Default 15s timeout

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API request failed (${response.status}): ${errorText.slice(0, 200)}`);
      }

      // Try to parse JSON, with graceful handling for non-JSON responses
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        // If response starts with HTML (common when API returns index.html fallback)
        if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
          throw new Error('Service temporarily unavailable. The server may still be starting up.');
        }
        throw new Error(`Invalid JSON response from server: ${text.slice(0, 100)}...`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${options?.timeout || 15000}ms`);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`API request failed for ${endpoint}:`, errorMessage);
      throw error;
    }
  }

  async getConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/api/config');
  }

  async getStatus(): Promise<StatusResponse> {
    return this.request<StatusResponse>('/api/dashboard/api/status');
  }

  async getConfigSources(): Promise<ConfigSourcesResponse> {
    return this.request<ConfigSourcesResponse>('/api/config/sources');
  }

  async reloadConfig(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.request('/api/config/reload', { method: 'POST' });
  }

  async createBot(botData: {
    name: string;
    messageProvider: string;
    llmProvider?: string;
    config?: ProviderConfig;
  }): Promise<{ success: boolean; message: string; bot: Bot }> {
    const payload = {
      ...botData,
      ...(botData.llmProvider ? {} : { llmProvider: undefined }),
    };
    return this.request('/api/bots', {
      method: 'POST',
      body: JSON.stringify(payload),
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
    return this.request(`/api/bots/${botId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async cloneBot(name: string, newName: string): Promise<{ success: boolean; message: string; bot: Bot }> {
    return this.request(`/api/bots/${name}/clone`, {
      method: 'POST',
      body: JSON.stringify({ newName }),
    });
  }

  async deleteBot(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/bots/${name}`, { method: 'DELETE' });
  }

  // Persona Methods
  async getPersonas(): Promise<Persona[]> {
    return this.request<Persona[]>('/api/personas');
  }

  async getPersona(id: string): Promise<Persona> {
    return this.request<Persona>(`/api/personas/${id}`);
  }

  async createPersona(data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>): Promise<Persona> {
    return this.request<Persona>('/api/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePersona(id: string, data: Partial<Persona>): Promise<Persona> {
    return this.request<Persona>(`/api/personas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePersona(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/personas/${id}`, {
      method: 'DELETE',
    });
  }

  // Secure Configuration Methods
  async getSecureConfigs(): Promise<{ configs: SecureConfig[] }> {
    return this.request('/api/secure-configs');
  }

  async getSecureConfig(name: string): Promise<{ config: SecureConfig }> {
    return this.request(`/api/secure-configs/${name}`);
  }

  async saveSecureConfig(name: string, data: Record<string, unknown>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> {
    return this.request('/api/secure-configs', {
      method: 'POST',
      body: JSON.stringify({ name, data, encryptSensitive }),
    });
  }

  async deleteSecureConfig(name: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/secure-configs/${name}`, { method: 'DELETE' });
  }

  async backupSecureConfigs(): Promise<{ success: boolean; message: string; backupFile: string }> {
    return this.request('/api/secure-configs/backup', { method: 'POST' });
  }

  async restoreSecureConfigs(backupFile: string): Promise<{ success: boolean; message: string }> {
    return this.request('/api/secure-configs/restore', {
      method: 'POST',
      body: JSON.stringify({ backupFile }),
    });
  }

  async getSecureConfigInfo(): Promise<{
    configDirectory: string;
    totalConfigs: number;
    directorySize: number;
    lastModified: string;
  }> {
    return this.request('/api/secure-configs/info');
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
      if (value) { query.append(key, value); }
    });
    const search = query.toString();
    const endpoint = `/api/dashboard/api/activity${search ? `?${search}` : ''}`;
    return this.request<ActivityResponse>(endpoint);
  }

  async clearCache(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/cache/clear', { method: 'POST' });
  }

  async exportConfig(): Promise<Blob> {
    const response = await fetch(buildUrl('/api/config/export'), {
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
      body: JSON.stringify(config),
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
      body: JSON.stringify(config),
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
  async getGlobalConfig(): Promise<Record<string, any>> {
    return this.request('/api/config/global');
  }

  async updateGlobalConfig(updates: Record<string, any>): Promise<{ success: boolean; message: string }> {
    return this.request('/api/config/global', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Import/Export Backup Methods
  async listSystemBackups(): Promise<any[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/api/import-export/backups');
    return res.data || [];
  }

  async createSystemBackup(options: {
    name: string;
    description?: string;
    encrypt?: boolean;
    encryptionKey?: string;
  }): Promise<{ success: boolean; message: string; data: any }> {
    return this.request('/api/import-export/backup', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async restoreSystemBackup(backupId: string, options: {
    overwrite?: boolean;
    decryptionKey?: string;
  } = {}): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/import-export/backups/${backupId}/restore`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async deleteSystemBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/import-export/backups/${backupId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
