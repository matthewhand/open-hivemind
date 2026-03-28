import Debug from 'debug';
import type {
  IToolProvider,
  ToolDefinition,
  ToolResult,
  ToolExecutionContext,
} from '@hivemind/shared-types';
import type {
  McpToolProviderConfig,
  McpToolsListResponse,
  McpToolCallResponse,
} from './types';

const debug = Debug('app:tool-mcp');

/**
 * MCP Tool Provider — connects to a Model Context Protocol server and
 * exposes its tools through the standard IToolProvider interface.
 *
 * Uses the official `@modelcontextprotocol/sdk` package, loaded dynamically
 * so the dependency stays optional at runtime.
 */
export class McpToolProvider implements IToolProvider {
  public readonly name: string;
  private config: McpToolProviderConfig;
  private client: any = null;
  private cachedTools: ToolDefinition[] = [];

  constructor(config: McpToolProviderConfig) {
    this.config = {
      timeout: 30_000,
      autoReconnect: true,
      transport: 'sse',
      ...config,
    };
    this.name = config.name || 'mcp';
  }

  // ---------------------------------------------------------------------------
  // IToolProvider
  // ---------------------------------------------------------------------------

  /**
   * Connect to the MCP server and return the list of available tools.
   */
  public async listTools(): Promise<ToolDefinition[]> {
    await this.ensureConnected();

    try {
      debug(`Listing tools from MCP server: ${this.name}`);
      const response: McpToolsListResponse = await this.client.listTools();

      this.cachedTools = response.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverName: this.name,
      }));

      debug(`Discovered ${this.cachedTools.length} tools from ${this.name}`);
      return this.cachedTools;
    } catch (error) {
      debug(`Error listing tools from ${this.name}:`, error);
      throw new Error(
        `Failed to list tools from MCP server ${this.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a named tool on the connected MCP server.
   */
  public async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    _context?: ToolExecutionContext
  ): Promise<ToolResult> {
    await this.ensureConnected();

    try {
      debug(`Executing tool ${toolName} on MCP server ${this.name}`);

      const response: McpToolCallResponse = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      debug(`Tool ${toolName} executed successfully on ${this.name}`);

      return {
        content: response.content,
        isError: response.isError ?? false,
      };
    } catch (error) {
      debug(`Error executing tool ${toolName} on ${this.name}:`, error);
      throw new Error(
        `Failed to execute tool ${toolName} on MCP server ${this.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Test whether the MCP server is reachable by attempting to list tools.
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.client.listTools();
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  /**
   * Ensure the internal MCP client is connected, creating it if necessary.
   */
  private async ensureConnected(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      // Dynamic import so the MCP SDK stays optional at install time
      const { Client } = require('@modelcontextprotocol/sdk');

      this.client = new Client({
        name: `Open-Hivemind-${this.name}`,
        version: '1.0.0',
      });

      debug(`Connecting to MCP server ${this.name} at ${this.config.serverUrl} (${this.config.transport})`);

      await this.client.connect({
        url: this.config.serverUrl,
        apiKey: this.config.apiKey,
      });

      debug(`Connected to MCP server ${this.name}`);
    } catch (error) {
      this.client = null;
      debug(`Failed to connect to MCP server ${this.name}:`, error);
      throw new Error(
        `Failed to connect to MCP server ${this.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from the MCP server and release resources.
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      debug(`Disconnecting from MCP server ${this.name}`);
      this.client = null;
      this.cachedTools = [];
    }
  }
}
