import Debug from 'debug';
import { SlackMessageProvider } from '@hivemind/adapter-slack';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { MCPGuard, type MCPGuardConfig } from './MCPGuard';

// DiscordMessageProvider imported dynamically to avoid ESM require error

const debug = Debug('app:mcp');

export interface MCPConfig {
  serverUrl: string;
  apiKey?: string;
  name: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
  serverName: string;
}

export class MCPService {
  private static instance: MCPService;
  private clients = new Map<string, any>();
  private tools = new Map<string, MCPTool[]>();

  private constructor() {}

  /**
   * Gets the singleton instance of MCPService.
   *
   * @returns {MCPService} The singleton instance
   * @example
   * ```typescript
   * const mcpService = MCPService.getInstance();
   * const tools = mcpService.getAllTools();
   * ```
   */

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * Connect to an MCP server and discover its tools
   */
  /**
   * Connects to an MCP server and discovers available tools.
   *
   * @param {MCPConfig} config - The server configuration containing URL and API key
   * @returns {Promise<MCPTool[]>} Array of discovered tools from the server
   * @throws {Error} If connection fails or server is unreachable
   * @example
   * ```typescript
   * const tools = await mcpService.connectToServer({
   *   name: 'my-server',
   *   serverUrl: 'https://api.example.com/mcp',
   *   apiKey: 'secret-key'
   * });
   * ```
   */

  public async connectToServer(config: MCPConfig): Promise<MCPTool[]> {
    try {
      debug(`Connecting to MCP server: ${config.name} at ${config.serverUrl}`);

      // Dynamically require the MCP SDK
      const { Client } = require('@modelcontextprotocol/sdk');

      // Create a new client for this server
      const client = new Client({
        name: 'Open-Hivemind',
        version: '1.0.0',
      });

      // Connect to the server
      await client.connect({
        url: config.serverUrl,
        apiKey: config.apiKey,
      });

      // Store the client
      this.clients.set(config.name, client);

      // Discover tools
      const tools = await client.listTools();

      // Add server name to each tool for identification
      const mcpTools: MCPTool[] = tools.tools.map((tool: any) => ({
        ...tool,
        serverName: config.name,
      }));

      // Store tools
      this.tools.set(config.name, mcpTools);

      debug(`Discovered ${tools.tools.length} tools from ${config.name}`);

      return mcpTools;
    } catch (error) {
      debug(`Error connecting to MCP server ${config.name}:`, error);
      throw new Error(
        `Failed to connect to MCP server ${config.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Test connection to an MCP server without storing the client
   */
  public async testConnection(config: MCPConfig): Promise<boolean> {
    try {
      debug(`Testing connection to MCP server: ${config.name} at ${config.serverUrl}`);

      // Dynamically require the MCP SDK
      const { Client } = require('@modelcontextprotocol/sdk');

      // Create a new client for this server
      const client = new Client({
        name: 'Open-Hivemind-Test',
        version: '1.0.0',
      });

      // Connect to the server
      await client.connect({
        url: config.serverUrl,
        apiKey: config.apiKey,
      });

      // Try to list tools to verify connection works
      await client.listTools();

      // If we got here, connection is successful
      // Since SDK doesn't have disconnect, we just let it go out of scope

      return true;
    } catch (error) {
      debug(`Error testing connection to MCP server ${config.name}:`, error);
      throw new Error(
        `Failed to connect to MCP server ${config.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from an MCP server
   */
  public async disconnectFromServer(serverName: string): Promise<void> {
    try {
      const client = this.clients.get(serverName);
      if (client) {
        // MCP SDK doesn't have an explicit disconnect method, so we'll just remove it
        this.clients.delete(serverName);
        this.tools.delete(serverName);
        debug(`Disconnected from MCP server: ${serverName}`);
      }
    } catch (error) {
      debug(`Error disconnecting from MCP server ${serverName}:`, error);
      throw new Error(
        `Failed to disconnect from MCP server ${serverName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Disconnect from all MCP servers - used for graceful shutdown
   */
  public async disconnectAll(): Promise<void> {
    debug('Disconnecting from all MCP servers...');

    const serverNames = Array.from(this.clients.keys());
    const disconnectPromises = serverNames.map((serverName) =>
      this.disconnectFromServer(serverName)
    );

    await Promise.allSettled(disconnectPromises);

    this.clients.clear();
    this.tools.clear();

    debug('All MCP connections closed');
  }

  /**
   * Get all tools from all connected servers
   */
  public getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const tools of this.tools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  public getToolsFromServer(serverName: string): MCPTool[] | undefined {
    return this.tools.get(serverName);
  }

  /**
   * Get all connected server names
   */
  public getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Execute a tool from a connected MCP server
   */
  /**
   * Executes a tool on a connected MCP server.
   *
   * @param {string} serverName - The name of the MCP server
   * @param {string} toolName - The name of the tool to execute
   * @param {any} arguments_ - The arguments to pass to the tool
   * @param {Object} [context] - Optional execution context for guard validation
   * @param {string} [context.botName] - The bot name for guard checks
   * @param {string} [context.messageProvider] - The message provider type
   * @param {string} [context.forumId] - The forum/channel ID
   * @param {string} [context.forumOwnerId] - The forum owner's user ID
   * @param {string} [context.userId] - The user ID executing the tool
   * @returns {Promise<any>} The result from the tool execution
   * @throws {Error} If not connected to server or tool execution fails
   * @example
   * ```typescript
   * const result = await mcpService.executeTool(
   *   'my-server',
   *   'search',
   *   { query: 'hello world' },
   *   { botName: 'assistant', userId: 'user123' }
   * );
   * ```
   */

  public async executeTool(
    serverName: string,
    toolName: string,
    arguments_: any,
    context?: {
      botName?: string;
      messageProvider?: string;
      forumId?: string;
      forumOwnerId?: string;
      userId?: string;
    }
  ): Promise<any> {
    try {
      if (context?.botName) {
        await this.assertGuardAllowsExecution(context);
      }

      const client = this.clients.get(serverName);
      if (!client) {
        throw new Error(`Not connected to MCP server: ${serverName}`);
      }

      debug(`Executing tool ${toolName} on server ${serverName}`);
      const result = await client.callTool({
        name: toolName,
        arguments: arguments_,
      });
      debug('Tool execution result:', result);

      return result;
    } catch (error) {
      debug(`Error executing tool ${toolName} on server ${serverName}:`, error);
      throw new Error(
        `Failed to execute tool ${toolName} on server ${serverName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async assertGuardAllowsExecution(context: {
    botName?: string;
    messageProvider?: string;
    forumId?: string;
    forumOwnerId?: string;
    userId?: string;
  }): Promise<void> {
    const { botName, messageProvider, forumId, forumOwnerId, userId } = context;

    if (!botName) {
      return;
    }

    const manager = BotConfigurationManager.getInstance();
    const botConfig = manager.getBot(botName);
    if (!botConfig?.mcpGuard) {
      return;
    }

    const guard: MCPGuardConfig = botConfig.mcpGuard;
    if (!guard.enabled) {
      return;
    }

    if (!userId) {
      throw new Error('MCP tool access denied: requesting user ID is required.');
    }

    let ownerId = forumOwnerId || null;
    if (!ownerId && forumId) {
      ownerId = await this.resolveForumOwner(messageProvider || botConfig.messageProvider, forumId);
    }

    if (guard.type === 'owner' && !ownerId) {
      throw new Error('MCP tool access denied: unable to determine forum owner.');
    }

    const allowed = MCPGuard.isUserAllowed(userId, ownerId || '', guard);
    if (!allowed) {
      throw new Error('MCP tool access denied by guard configuration.');
    }
  }

  private async resolveForumOwner(
    providerName: string | undefined,
    forumId: string
  ): Promise<string | null> {
    if (!providerName) {
      return null;
    }

    const normalized = providerName.toLowerCase();

    try {
      if (normalized === 'slack') {
        const provider = new SlackMessageProvider();
        return await provider.getForumOwner(forumId);
      }

      if (normalized === 'discord') {
        const { DiscordMessageProvider } = await import('@hivemind/adapter-discord');
        const provider = new DiscordMessageProvider();
        return await provider.getForumOwner(forumId);
      }
    } catch (error) {
      debug(`Unable to resolve forum owner via provider ${providerName}:`, error);
    }

    return null;
  }
}
