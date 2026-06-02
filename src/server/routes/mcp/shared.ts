import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ErrorUtils } from '@src/types/errors';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

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

/**
 * Returns the set of tool names that ANY bot has flagged as "sensitive" in an
 * *enabled* `mcpGuard.sensitiveTools` list.
 *
 * The per-bot `MCPGuard` (owner/custom user-allow-list) used on the LLM tool
 * path is intentionally NOT applied to these admin routes: it gates which
 * *chat users* in a *bot's forum* may trigger a tool and therefore requires a
 * bot/forum/owner/user context that simply does not exist for a direct WebUI
 * admin request (the entire `/api/mcp` router is already locked behind
 * `authenticate + requireAdmin`). The one piece of guard intent that DOES carry
 * over is the `sensitiveTools` HITL guardrail: tools an operator has marked as
 * requiring administrator approval should not be executable via the unattended
 * direct `call-tool` path either. We therefore aggregate sensitive tool names
 * across all bot guard configs so the admin route can refuse them, while never
 * blocking ordinary (non-sensitive) admin tool usage.
 */
export const getGuardedSensitiveTools = (): Set<string> => {
  const sensitive = new Set<string>();
  try {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    for (const bot of bots) {
      const guard = bot.mcpGuard;
      if (guard && guard.enabled && Array.isArray(guard.sensitiveTools)) {
        for (const toolName of guard.sensitiveTools) {
          if (typeof toolName === 'string' && toolName.length > 0) {
            sensitive.add(toolName);
          }
        }
      }
    }
  } catch (error: unknown) {
    // Be conservative on lookup failure: do not lock out admins. Log and treat
    // as "no sensitive tools" so legitimate admin operations still work.
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Failed to resolve guarded sensitive tools:', ErrorUtils.getMessage(hivemindError));
  }
  return sensitive;
};

/**
 * Whether a given tool name is flagged sensitive by any enabled bot guard.
 * Used by the admin direct `call-tool` route to refuse unattended execution of
 * tools that an operator marked as requiring administrator approval (HITL).
 */
export const isToolGuardedAsSensitive = (toolName: string): boolean =>
  getGuardedSensitiveTools().has(toolName);

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
