import Debug from 'debug';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

const debug = Debug('app:tool-mcp');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Standard MCP server configuration (as used in Claude Desktop, etc.)
 * This is the format users are familiar with.
 */
export interface MCPServerConfig {
  /** Command to run (e.g., 'npx', 'node', 'python') */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
  /** Timeout for requests in milliseconds */
  timeout?: number;
}

/**
 * Standard MCP configuration format (mcp.json style)
 */
export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// ---------------------------------------------------------------------------
// MCPProvider
// ---------------------------------------------------------------------------

export class MCPProvider {
  readonly id = 'mcp';
  readonly label = 'MCP';
  readonly type = 'tool' as const;

  private config: MCPConfig;
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private tools: Map<string, MCPTool[]> = new Map();
  private resources: Map<string, MCPResource[]> = new Map();

  constructor(config?: MCPConfig) {
    debug('Initializing MCPProvider with config: %O', config);
    this.config = config || { mcpServers: {} };
  }

  /**
   * Update MCP configuration (from JSON editor)
   */
  async updateConfig(config: MCPConfig): Promise<void> {
    debug('Updating MCP config');

    // Disconnect old servers that are no longer in config
    for (const [name] of this.clients) {
      if (!config.mcpServers[name]) {
        await this.disconnectServer(name);
      }
    }

    this.config = config;

    // Connect new servers
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (!this.clients.has(name)) {
        await this.connectServer(name, serverConfig);
      }
    }
  }

  /**
   * Get current configuration (for JSON editor)
   */
  getConfig(): MCPConfig {
    return this.config;
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    debug('Connecting to MCP server: %s', name);

    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: { ...process.env, ...config.env },
        cwd: config.cwd,
      });

      const client = new Client(
        { name: 'open-hivemind', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);

      this.clients.set(name, client);
      this.transports.set(name, transport);

      // Fetch available tools
      const toolsResult = await client.listTools();
      this.tools.set(name, toolsResult.tools as MCPTool[]);

      // Fetch available resources
      try {
        const resourcesResult = await client.listResources();
        this.resources.set(name, resourcesResult.resources as MCPResource[]);
      } catch (e) {
        debug('Server %s does not support resources', name);
        this.resources.set(name, []);
      }

      debug('Connected to %s: %d tools, %d resources', name, this.tools.get(name)?.length || 0, this.resources.get(name)?.length || 0);
    } catch (e: any) {
      debug('Failed to connect to %s: %s', name, e.message);
      throw new Error(`Failed to connect to MCP server "${name}": ${e.message}`);
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(name: string): Promise<void> {
    debug('Disconnecting from MCP server: %s', name);

    const client = this.clients.get(name);
    if (client) {
      try {
        await client.close();
      } catch (e) {
        debug('Error closing client %s: %s', name, e);
      }
    }

    this.clients.delete(name);
    this.transports.delete(name);
    this.tools.delete(name);
    this.resources.delete(name);
  }

  /**
   * List all connected servers
   */
  listServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * List all available tools from all servers
   */
  listAllTools(): Array<{ server: string; tool: MCPTool }> {
    const result: Array<{ server: string; tool: MCPTool }> = [];
    for (const [server, tools] of this.tools) {
      for (const tool of tools) {
        result.push({ server, tool });
      }
    }
    return result;
  }

  /**
   * List tools from a specific server
   */
  listTools(serverName: string): MCPTool[] {
    return this.tools.get(serverName) || [];
  }

  /**
   * Execute a tool
   */
  async executeTool(serverName: string, toolName: string, args: Record<string, any>): Promise<any> {
    debug('Executing tool %s/%s with args: %O', serverName, toolName, args);

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server "${serverName}" not connected`);
    }

    const result = await client.callTool({
      name: toolName,
      arguments: args,
    });

    return result.content;
  }

  /**
   * List all resources from all servers
   */
  listAllResources(): Array<{ server: string; resource: MCPResource }> {
    const result: Array<{ server: string; resource: MCPResource }> = [];
    for (const [server, resources] of this.resources) {
      for (const resource of resources) {
        result.push({ server, resource });
      }
    }
    return result;
  }

  /**
   * Read a resource
   */
  async readResource(serverName: string, uri: string): Promise<any> {
    debug('Reading resource %s from %s', uri, serverName);

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server "${serverName}" not connected`);
    }

    const result = await client.readResource({ uri });
    return result.contents;
  }

  /**
   * Get server status
   */
  getServerStatus(name: string): { connected: boolean; toolCount: number; resourceCount: number } {
    const connected = this.clients.has(name);
    return {
      connected,
      toolCount: this.tools.get(name)?.length || 0,
      resourceCount: this.resources.get(name)?.length || 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory and manifest
// ---------------------------------------------------------------------------

export function create(config?: MCPConfig): MCPProvider {
  return new MCPProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'MCP',
  description: 'Connect to local MCP (Model Context Protocol) servers via stdio — tools, resources, and prompts',
  type: 'tool',
  minVersion: '1.0.0',
};
