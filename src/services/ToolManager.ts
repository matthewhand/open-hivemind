import Debug from 'debug';
import { MCPService } from '@src/mcp/MCPService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { getMcpServerProfileByKey } from '@config/mcpServerProfiles';
import { withTimeout } from '@common/withTimeout';

const debug = Debug('app:ToolManager');

/** Tool definition in a provider-agnostic format. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Which MCP server owns this tool. */
  serverName: string;
}

/** Result returned after executing a single tool call. */
export interface ToolResult {
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/** OpenAI function-calling compatible tool format. */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Default safety limits. */
const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOOL_CALLS = 5;

/**
 * ToolManager — singleton service that manages tool execution for bots.
 *
 * It bridges MCPService (which connects to MCP servers and discovers tools)
 * with the LLM call pipeline so bots can actually invoke tools during
 * conversations.
 */
export class ToolManager {
  private static instance: ToolManager;

  private constructor() {}

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Aggregates tools from all MCP servers assigned to a bot (via its
   * mcpServers list and/or its mcpServerProfile).
   */
  public async getToolsForBot(botName: string): Promise<ToolDefinition[]> {
    try {
      const mcpService = MCPService.getInstance();
      const serverNames = this.getServerNamesForBot(botName);

      if (serverNames.length === 0) {
        debug(`No MCP servers configured for bot: ${botName}`);
        return [];
      }

      const tools: ToolDefinition[] = [];

      for (const serverName of serverNames) {
        const serverTools = mcpService.getToolsFromServer(serverName);
        if (serverTools) {
          for (const t of serverTools) {
            tools.push({
              name: t.name,
              description: t.description || '',
              parameters: t.inputSchema || { type: 'object', properties: {} },
              serverName: t.serverName,
            });
          }
        } else {
          debug(`No tools cached for MCP server "${serverName}" — is it connected?`);
        }
      }

      debug(`Resolved ${tools.length} tools for bot "${botName}"`);
      return tools;
    } catch (error) {
      debug(`Error getting tools for bot "${botName}":`, error);
      return [];
    }
  }

  /**
   * Executes a tool call by routing it to the correct MCP server.
   *
   * Enforces a per-call timeout (default 30 s) and isolates errors so a
   * single tool failure never crashes the overall response pipeline.
   */
  public async executeTool(
    botName: string,
    toolName: string,
    args: Record<string, unknown>,
    context?: {
      userId?: string;
      channelId?: string;
      messageProvider?: string;
      forumId?: string;
      forumOwnerId?: string;
    },
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      debug(`[${botName}] Executing tool "${toolName}" with args:`, args);

      const mcpService = MCPService.getInstance();

      // Find which server owns this tool.
      const serverName = this.findServerForTool(botName, toolName);
      if (!serverName) {
        const msg = `Tool "${toolName}" not found on any MCP server for bot "${botName}"`;
        debug(msg);
        return { toolName, success: false, error: msg };
      }

      // Execute with AbortController-based timeout.
      const timeoutMs = DEFAULT_TOOL_TIMEOUT_MS;
      const result = await withTimeout(
        () => mcpService.executeTool(serverName, toolName, args, {
          botName,
          userId: context?.userId,
          messageProvider: context?.messageProvider,
          forumId: context?.forumId,
          forumOwnerId: context?.forumOwnerId,
        }),
        timeoutMs,
        `Tool "${toolName}"`,
      );

      const elapsed = Date.now() - startTime;
      debug(`[${botName}] Tool "${toolName}" completed in ${elapsed}ms`);

      return { toolName, success: true, result };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      debug(`[${botName}] Tool "${toolName}" failed after ${elapsed}ms: ${errorMessage}`);

      return { toolName, success: false, error: errorMessage };
    }
  }

  /**
   * Converts an array of ToolDefinitions into the OpenAI function-calling
   * format suitable for the `tools` parameter in a chat completion request.
   */
  public formatToolsForLLM(tools: ToolDefinition[]): OpenAITool[] {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /** Maximum number of tool calls allowed per user message (safety cap). */
  public getMaxToolCalls(): number {
    return DEFAULT_MAX_TOOL_CALLS;
  }

  // ---------------------------------------------------------------------------
  // Helpers (private)
  // ---------------------------------------------------------------------------

  /**
   * Resolves the list of MCP server names that a bot should have access to
   * by examining `mcpServers` and `mcpServerProfile` on its config.
   */
  private getServerNamesForBot(botName: string): string[] {
    const manager = BotConfigurationManager.getInstance();
    const botConfig = manager.getBot(botName);
    if (!botConfig) {
      debug(`Bot "${botName}" not found in configuration`);
      return [];
    }

    const names = new Set<string>();

    // Direct MCP servers list on the bot config.
    const mcpServers = (botConfig as Record<string, unknown>).mcpServers ?? (botConfig as Record<string, unknown>).MCP_SERVERS;
    if (Array.isArray(mcpServers)) {
      for (const s of mcpServers) {
        if (typeof s === 'object' && s.name) {
          names.add(s.name);
        }
      }
    }

    // MCP server profile (a named bundle of servers).
    const profileKey =
      (botConfig as Record<string, unknown>).mcpServerProfile ?? (botConfig as Record<string, unknown>).MCP_SERVER_PROFILE;
    if (profileKey) {
      const profile = getMcpServerProfileByKey(profileKey);
      if (profile) {
        for (const s of profile.mcpServers) {
          names.add(s.name);
        }
      }
    }

    return Array.from(names);
  }

  /**
   * Finds which MCP server owns a given tool for a specific bot.
   */
  private findServerForTool(botName: string, toolName: string): string | null {
    const mcpService = MCPService.getInstance();
    const serverNames = this.getServerNamesForBot(botName);

    for (const serverName of serverNames) {
      const tools = mcpService.getToolsFromServer(serverName);
      if (tools?.some((t) => t.name === toolName)) {
        return serverName;
      }
    }

    return null;
  }

  // timeoutPromise replaced by withTimeout (AbortController-based) above.
}
