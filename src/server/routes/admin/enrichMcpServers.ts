import type { MCPTool } from '../../../mcp/MCPService';

/**
 * A connected MCP server as reported by {@link MCPService.getConnectedServersWithMetadata}.
 */
export interface ConnectedMcpServer {
  name: string;
  connected: boolean;
  tools: MCPTool[];
  toolCount: number;
  lastConnected?: string;
}

/**
 * A persisted MCP configuration as returned by {@link webUIStorage.getMcps}.
 * Only `name` is guaranteed; other fields (serverUrl/url/description) are
 * optional and looked up defensively.
 */
export interface StoredMcpConfig {
  name: string;
  serverUrl?: string;
  url?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * The shape returned to the WebUI for each connected MCP server, after merging
 * runtime connection metadata with persisted configuration.
 */
export interface EnrichedMcpServer {
  name: string;
  serverUrl: string;
  connected: boolean;
  tools: MCPTool[];
  toolCount: number;
  lastConnected?: string;
  description: string;
}

/**
 * Enrich the live, connected MCP servers with their persisted configuration
 * (serverUrl / description).
 *
 * Performance: the stored configs are indexed into a {@link Map} keyed by name
 * so the enrichment is O(n + m) rather than the O(n * m) that a `.find()` call
 * inside the `.map()` loop would incur. The duplicate-name case keeps the
 * **first** occurrence, matching the previous `.find()` semantics.
 *
 * @param connectedServers Live servers from `MCPService.getConnectedServersWithMetadata()`.
 * @param storedMcps Persisted configs from `webUIStorage.getMcps()`.
 * @returns The merged server views for the admin/WebUI response.
 */
export function enrichConnectedMcpServers(
  connectedServers: ReadonlyArray<ConnectedMcpServer>,
  storedMcps: ReadonlyArray<StoredMcpConfig>
): EnrichedMcpServer[] {
  const storedMcpsMap = new Map<string, StoredMcpConfig>();
  for (const mcp of storedMcps) {
    // Preserve `.find()` semantics: first match wins on duplicate names.
    if (!storedMcpsMap.has(mcp.name)) {
      storedMcpsMap.set(mcp.name, mcp);
    }
  }

  return connectedServers.map((server) => {
    const storedConfig = storedMcpsMap.get(server.name);
    return {
      name: server.name,
      serverUrl: storedConfig?.serverUrl || storedConfig?.url || '',
      connected: server.connected,
      tools: server.tools,
      toolCount: server.toolCount,
      lastConnected: server.lastConnected,
      description: storedConfig?.description || '',
    };
  });
}
