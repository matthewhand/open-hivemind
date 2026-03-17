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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    baseURL: baseURL,
=======
    baseUrl: baseUrl,
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
    baseUrl: baseUrl,
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
    token: apiKey,
=======
    baseURL: baseUrl,
    apiKey: apiKey,
>>>>>>> origin/refiner-promise-handling-personas-11974248204293140303
  });

  const agents = await client.agents.list();

  // Transform to simplified agent summary
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  return agents.data.map((agent: any) => ({
=======
  return agents.map((agent: any) => ({
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
  return agents.map((agent: any) => ({
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
=======
  return (agents as unknown as any[]).map((agent: any) => ({
>>>>>>> origin/refiner-promise-handling-personas-11974248204293140303
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
<<<<<<< HEAD
export async function getAgent(agentId: string, apiKey: string, apiUrl?: string): Promise<AgentSummary> {
  const baseURL = apiUrl || 'https://api.letta.com/v1';
=======
export async function getAgent(
  agentId: string,
  apiKey: string,
  apiUrl?: string
): Promise<AgentSummary> {
  const baseUrl = apiUrl || 'https://api.letta.com/v1';
>>>>>>> origin/refiner-comma-separated-input-ux-5264879587366086815

  const client = new Letta({
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    baseURL: baseURL,
=======
    baseUrl: baseUrl,
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
=======
    baseUrl: baseUrl,
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
    token: apiKey,
=======
    baseURL: baseUrl,
    apiKey: apiKey,
>>>>>>> origin/refiner-promise-handling-personas-11974248204293140303
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
