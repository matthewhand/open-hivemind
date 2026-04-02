import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ErrorUtils } from '@src/types/errors';

const debug = Debug('app:webui:mcp:shared');

export interface MCPServer {
  name: string;
  url: string;
  apiKey?: string;
  connected: boolean;
  tools?: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }[];
  lastConnected?: string;
  error?: string;
}

export interface MCPClient {
  client: Client;
  transport: StdioClientTransport;
  server: MCPServer;
}

export const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

// In-memory store for connected MCP clients
export const connectedClients = new Map<string, MCPClient>();

// Ensure data directory exists
export const ensureDataDir = async (): Promise<void> => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error creating data directory:', ErrorUtils.getMessage(hivemindError));
  }
};

// Load MCP server configurations
export const loadMCPServers = async (): Promise<MCPServer[]> => {
  try {
    const data = await fs.readFile(MCP_SERVERS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(
      'MCP servers config file not found, using defaults:',
      ErrorUtils.getMessage(hivemindError)
    );
    return [];
  }
};

// Save MCP server configurations
export const saveMCPServers = async (servers: MCPServer[]): Promise<void> => {
  await ensureDataDir();
  // Don't save tools definitions, they are fetched dynamically
  const serversToSave = servers.map((s) => ({
    ...s,
    tools: undefined,
  }));
  await fs.writeFile(MCP_SERVERS_CONFIG_FILE, JSON.stringify(serversToSave, null, 2), 'utf8');
};

// Connect to MCP server
export const connectToMCPServer = async (server: MCPServer): Promise<MCPClient> => {
  try {
    debug(`Connecting to MCP server: ${server.name} at ${server.url}`);

    // For stdio transport (local MCP servers)
    if (server.url.startsWith('stdio://')) {
      const command = server.url.replace('stdio://', '');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const transport = new StdioClientTransport({
        command: command,
        args: [],
      });

      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const client = new Client(
        {
          name: `hivemind-${server.name}`,
          version: '1.0.0',
        },
        {
          capabilities: {
            experimental: {},
          },
        }
      );

      await client.connect(transport);

      // Get available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
      }));

      const mcpClient: MCPClient = {
        client,
        transport,
        server: {
          ...server,
          connected: true,
          tools,
          lastConnected: new Date().toISOString(),
          error: undefined,
        },
      };

      connectedClients.set(server.name, mcpClient);
      debug(`Successfully connected to MCP server: ${server.name}`);

      return mcpClient;
    } else {
      throw new Error(`Unsupported MCP server URL scheme: ${server.url}`);
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(`Failed to connect to MCP server ${server.name}:`, ErrorUtils.getMessage(hivemindError));
    throw hivemindError;
  }
};

// Disconnect from MCP server
export const disconnectFromMCPServer = async (serverName: string): Promise<void> => {
  try {
    const mcpClient = connectedClients.get(serverName);
    if (mcpClient) {
      await mcpClient.client.close();
      connectedClients.delete(serverName);
      debug(`Disconnected from MCP server: ${serverName}`);
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(
      `Error disconnecting from MCP server ${serverName}:`,
      ErrorUtils.getMessage(hivemindError)
    );
    throw hivemindError;
  }
};
