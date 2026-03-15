import Letta from '@letta-ai/letta-client';

/**
 * Summary of a Letta agent returned by the agent browser functions.
 */
export interface AgentSummary {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * List all available agents from the Letta API.
 *
 * @param apiKey - The Letta API key
 * @param apiUrl - Optional API URL (defaults to https://api.letta.com/v1)
 * @returns Array of agent summaries
 */
export async function listAgents(apiKey: string, apiUrl?: string): Promise<AgentSummary[]> {
  const baseURL = apiUrl || 'https://api.letta.com/v1';

  const client = new Letta({
    baseURL: baseURL,
    apiKey: apiKey,
  });

  const agents = await client.agents.list();

  // Transform to simplified agent summary
  return ((agents as any)?.data || (agents as any)?.agents || agents as any).map((agent: any) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  }));
}

/**
 * Get details for a specific agent from the Letta API.
 *
 * @param agentId - The ID of the agent to fetch
 * @param apiKey - The Letta API key
 * @param apiUrl - Optional API URL (defaults to https://api.letta.com/v1)
 * @returns Agent summary
 */
export async function getAgent(agentId: string, apiKey: string, apiUrl?: string): Promise<AgentSummary> {
  const baseURL = apiUrl || 'https://api.letta.com/v1';

  const client = new Letta({
    baseURL: baseURL,
    apiKey: apiKey,
  });

  const agent = await client.agents.retrieve(agentId);

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  };
}
