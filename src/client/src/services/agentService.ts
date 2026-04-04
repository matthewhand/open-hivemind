async function apiFetch<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export interface Agent {
  provider: string;
  name: string;
  defaultChannel?: string;
  mode?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: any[];
  mcpGuard?: any;
  llmProvider?: string;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
}

export interface AgentPersona {
  key: string;
  name: string;
  systemPrompt: string;
}

export interface MCPConfig {
  serverUrl: string;
  apiKey?: string;
  name: string;
}

export const getAgents = async (): Promise<Agent[]> => {
  try {
    const data = await apiFetch<{ agents: Agent[] }>('GET', '/api/admin/agents');
    return data.agents || [];
  } catch (_error) {
    const data = await apiFetch<{ slackInfo: Agent[]; discordInfo: Agent[] }>('GET', '/api/admin/status');
    const { slackInfo, discordInfo } = data;
    return [...(slackInfo || []), ...(discordInfo || [])];
  }
};

export const createAgent = async (agent: Omit<Agent, 'envOverrides'>): Promise<Agent> => {
  const data = await apiFetch<{ agent: Agent }>('POST', '/api/admin/agents', agent);
  return data.agent;
};

export const updateAgent = async (id: string, agent: Partial<Agent>): Promise<Agent> => {
  const data = await apiFetch<{ agent: Agent }>('PUT', `/api/admin/agents/${id}`, agent);
  return data.agent;
};

export const deleteAgent = async (id: string): Promise<void> => {
  await apiFetch<void>('DELETE', `/api/admin/agents/${id}`);
};

export const getPersonas = async (): Promise<AgentPersona[]> => {
  const data = await apiFetch<{ personas: AgentPersona[] }>('GET', '/api/admin/agents/personas');
  return data.personas || [];
};

export const createPersona = async (persona: Omit<AgentPersona, 'key'>): Promise<void> => {
  await apiFetch<void>('POST', '/api/admin/agents/personas', persona);
};

export const updatePersona = async (key: string, persona: Omit<AgentPersona, 'key'>): Promise<void> => {
  await apiFetch<void>('PUT', `/api/admin/agents/personas/${key}`, persona);
};

export const deletePersona = async (key: string): Promise<void> => {
  await apiFetch<void>('DELETE', `/api/admin/agents/personas/${key}`);
};

export const getMCPServers = async (): Promise<string[]> => {
  const data = await apiFetch<{ servers: string[] }>('GET', '/api/admin/mcp/servers');
  return data.servers || [];
};

export const connectMCP = async (config: MCPConfig): Promise<void> => {
  await apiFetch<void>('POST', '/api/admin/mcp-servers/connect', config);
};

export const disconnectMCP = async (name: string): Promise<void> => {
  await apiFetch<void>('POST', '/api/admin/mcp-servers/disconnect', { name });
};

export const getEnvOverrides = async (): Promise<Record<string, string>> => {
  const data = await apiFetch<{ envVars: Record<string, string> }>('GET', '/api/admin/env-overrides');
  return data.envVars;
};

export interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider?: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

export interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  messageRate: number;
  errorRate: number;
}

export const getActivityMessages = async (limit = 100): Promise<MessageFlowEvent[]> => {
  const data = await apiFetch<{ messages: MessageFlowEvent[] }>('GET', '/api/admin/activity/messages');
  return data.messages;
};

export const getPerformanceMetrics = async (limit = 60): Promise<PerformanceMetric[]> => {
  const data = await apiFetch<{ metrics: PerformanceMetric[] }>('GET', '/api/admin/activity/metrics');
  return data.metrics;
};
