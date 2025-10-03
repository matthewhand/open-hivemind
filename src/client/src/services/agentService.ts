import axios from 'axios';

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

export interface Persona {
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
    const response = await axios.get('/api/admin/agents');
    return response.data.agents || [];
  } catch (error) {
    // Fallback to old endpoint if new one doesn't exist
    const response = await axios.get('/api/admin/status');
    const { slackInfo, discordInfo } = response.data;
    return [...(slackInfo || []), ...(discordInfo || [])];
  }
};

export const createAgent = async (agent: Omit<Agent, 'envOverrides'>): Promise<Agent> => {
  const response = await axios.post('/api/admin/agents', agent);
  return response.data.agent;
};

export const updateAgent = async (id: string, agent: Partial<Agent>): Promise<Agent> => {
  const response = await axios.put(`/api/admin/agents/${id}`, agent);
  return response.data.agent;
};

export const deleteAgent = async (id: string): Promise<void> => {
  await axios.delete(`/api/admin/agents/${id}`);
};

export const getPersonas = async (): Promise<Persona[]> => {
  const response = await axios.get('/api/admin/agents/personas');
  return response.data.personas || [];
};

export const createPersona = async (persona: Omit<Persona, 'key'>): Promise<void> => {
  await axios.post('/api/admin/agents/personas', persona);
};

export const updatePersona = async (key: string, persona: Omit<Persona, 'key'>): Promise<void> => {
  await axios.put(`/api/admin/agents/personas/${key}`, persona);
};

export const deletePersona = async (key: string): Promise<void> => {
  await axios.delete(`/api/admin/agents/personas/${key}`);
};

export const getMCPServers = async (): Promise<string[]> => {
  const response = await axios.get('/api/admin/mcp/servers');
  return response.data.servers || [];
};

export const connectMCP = async (config: MCPConfig): Promise<void> => {
  await axios.post('/api/admin/mcp-servers/connect', config);
};

export const disconnectMCP = async (name: string): Promise<void> => {
  await axios.post('/api/admin/mcp-servers/disconnect', { name });
};

export const getEnvOverrides = async (): Promise<Record<string, string>> => {
  const response = await axios.get('/api/admin/env-overrides');
  return response.data.envVars;
};

export interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
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
  const response = await axios.get('/api/admin/activity/messages');
  return response.data.messages;
};

export const getPerformanceMetrics = async (limit = 60): Promise<PerformanceMetric[]> => {
  const response = await axios.get('/api/admin/activity/metrics');
  return response.data.metrics;
};
