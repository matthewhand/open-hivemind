/**
 * MCP-specific configuration and types for the tool-mcp package.
 */

/** Transport protocol used to communicate with the MCP server. */
export type McpTransport = 'stdio' | 'sse' | 'streamable-http';

/** Configuration required to connect to an MCP server. */
export interface McpToolProviderConfig {
  /** Human-readable name for this provider instance */
  name: string;
  /** URL of the MCP server (for SSE / streamable-http transports) */
  serverUrl: string;
  /** Transport protocol to use */
  transport: McpTransport;
  /** Command to spawn the MCP server (stdio transport only) */
  command?: string;
  /** Optional API key for authenticated servers */
  apiKey?: string;
  /** Tool execution timeout in milliseconds (default: 30 000) */
  timeout?: number;
  /** Whether to automatically reconnect on connection loss (default: true) */
  autoReconnect?: boolean;
}

/** Raw tool listing response from the MCP SDK. */
export interface McpToolsListResponse {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
}

/** Raw tool call response from the MCP SDK. */
export interface McpToolCallResponse {
  content: unknown;
  isError?: boolean;
}
