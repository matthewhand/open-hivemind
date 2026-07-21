import Debug from 'debug';
import type { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import { PendingActionManager } from '@src/managers/PendingActionManager';
import { MCPService } from '@src/mcp/MCPService';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { getMcpServerProfileByKey } from '@config/mcpServerProfiles';
import { withTimeout } from '@common/withTimeout';

const debug = Debug('app:ToolManager');

/** Max handoff hops to prevent A→B→A infinite transfer loops. */
const MAX_TRANSFER_HOPS = 3;

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

      // Automatically inject the built-in swarm routing tool
      tools.push({
        name: 'transfer_to_bot',
        description:
          'Transfer the conversation to another specialized bot in the hivemind when they are better suited to handle the request.',
        serverName: 'built-in',
        parameters: {
          type: 'object',
          properties: {
            targetBotName: {
              type: 'string',
              description: 'The exact name of the bot to transfer the conversation to.',
            },
            reason: {
              type: 'string',
              description: 'The reason for transferring the conversation.',
            },
          },
          required: ['targetBotName', 'reason'],
        },
      });

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
      /** Original platform message — required for real handoff. */
      sourceMessage?: IMessage;
      history?: IMessage[];
      /** Prior handoff hop count (prevents transfer loops). */
      transferHop?: number;
      sourceBotConfig?: Record<string, unknown>;
    }
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      debug(`[${botName}] Executing tool "${toolName}" with args:`, args);

      // Handle built-in swarm routing via MessageBus re-emit to the target bot.
      if (toolName === 'transfer_to_bot') {
        return this.executeTransferToBot(botName, args, context);
      }

      const mcpService = MCPService.getInstance();

      // Find which server owns this tool.
      const serverName = this.findServerForTool(botName, toolName);
      if (!serverName) {
        const msg = `Tool "${toolName}" not found on any MCP server for bot "${botName}"`;
        debug(msg);
        return { toolName, success: false, error: msg };
      }

      // HITL Action Guardrail check
      const botConfig = BotConfigurationManager.getInstance().getBot(botName);
      const mcpGuard = botConfig?.mcpGuard;
      const isSensitive = mcpGuard?.enabled && mcpGuard.sensitiveTools?.includes(toolName);

      if (isSensitive) {
        debug(`[${botName}] Tool "${toolName}" is sensitive. Requesting admin approval...`);
        const pendingMgr = PendingActionManager.getInstance();
        const approved = await pendingMgr.create(botName, toolName, args, context);

        if (!approved) {
          const msg = `Tool execution denied: "${toolName}" requires administrator approval.`;
          debug(`[${botName}] ${msg}`);
          return { toolName, success: false, error: msg };
        }
        debug(`[${botName}] Tool "${toolName}" approved by admin.`);
      }

      // Execute with AbortController-based timeout.
      const timeoutMs = DEFAULT_TOOL_TIMEOUT_MS;
      const result = await withTimeout(
        () =>
          mcpService.executeTool(serverName, toolName, args, {
            botName,
            userId: context?.userId,
            messageProvider: context?.messageProvider,
            forumId: context?.forumId,
            forumOwnerId: context?.forumOwnerId,
          }),
        timeoutMs,
        `Tool "${toolName}"`
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
    const mcpServers =
      (botConfig as Record<string, unknown>).mcpServers ??
      (botConfig as Record<string, unknown>).MCP_SERVERS;
    if (Array.isArray(mcpServers)) {
      for (const s of mcpServers) {
        if (typeof s === 'object' && s.name) {
          names.add(s.name);
        }
      }
    }

    // MCP server profile (a named bundle of servers).
    const profileKey =
      (botConfig as Record<string, unknown>).mcpServerProfile ??
      (botConfig as Record<string, unknown>).MCP_SERVER_PROFILE;
    if (profileKey) {
      const profile = getMcpServerProfileByKey(profileKey as string);
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

  /**
   * Real multi-bot handoff: validate target, release the current swarm claim,
   * and re-emit `message:incoming` onto the MessageBus with the target bot's
   * config so the pipeline processes the conversation under the new bot.
   */
  private executeTransferToBot(
    botName: string,
    args: Record<string, unknown>,
    context?: {
      userId?: string;
      channelId?: string;
      messageProvider?: string;
      forumId?: string;
      forumOwnerId?: string;
      sourceMessage?: IMessage;
      history?: IMessage[];
      transferHop?: number;
      sourceBotConfig?: Record<string, unknown>;
    }
  ): ToolResult {
    const toolName = 'transfer_to_bot';
    const targetBotName = typeof args.targetBotName === 'string' ? args.targetBotName.trim() : '';
    const reason = typeof args.reason === 'string' ? args.reason : '';

    if (!targetBotName) {
      return {
        toolName,
        success: false,
        error: 'transfer_to_bot requires a non-empty targetBotName',
      };
    }

    if (targetBotName === botName) {
      return {
        toolName,
        success: false,
        error: `Cannot transfer to self ("${botName}")`,
      };
    }

    const hop = (context?.transferHop ?? 0) + 1;
    if (hop > MAX_TRANSFER_HOPS) {
      return {
        toolName,
        success: false,
        error: `Transfer hop limit (${MAX_TRANSFER_HOPS}) exceeded; refusing further handoffs`,
      };
    }

    const sourceMessage = context?.sourceMessage;
    if (!sourceMessage) {
      return {
        toolName,
        success: false,
        error:
          'transfer_to_bot cannot hand off without the original message context (sourceMessage missing)',
      };
    }

    const manager = BotConfigurationManager.getInstance();
    const targetBot = manager.getBot(targetBotName);
    if (!targetBot) {
      const known = manager
        .getAllBots()
        .map((b) => b.name)
        .filter(Boolean)
        .slice(0, 20);
      return {
        toolName,
        success: false,
        error: `Target bot "${targetBotName}" not found. Known bots: ${known.join(', ') || '(none)'}`,
      };
    }

    const targetConfig = { ...(targetBot as unknown as Record<string, unknown>) };
    const history = context?.history ?? [];
    const channelId =
      context?.channelId ||
      (typeof sourceMessage.getChannelId === 'function' ? sourceMessage.getChannelId() : '') ||
      '';
    const platform =
      sourceMessage.platform ||
      context?.messageProvider ||
      String(targetConfig.MESSAGE_PROVIDER || targetConfig.messageProvider || 'unknown');

    // Free the exclusive swarm claim so the target bot can re-claim the message.
    try {
      const messageId =
        typeof sourceMessage.getMessageId === 'function' ? sourceMessage.getMessageId() : undefined;
      if (messageId) {
        SwarmCoordinator.getInstance().releaseClaim(messageId);
        debug(
          `[${botName}] Released swarm claim on %s for handoff to %s`,
          messageId,
          targetBotName
        );
      }
    } catch (err) {
      debug(`[${botName}] Failed to release swarm claim (continuing handoff): %O`, err);
    }

    const handoffMeta = {
      handoff: {
        from: botName,
        to: targetBotName,
        reason,
        hop,
        at: Date.now(),
      },
      transferHop: hop,
    };

    debug(
      `[${botName}] Emitting message:incoming handoff to "%s" (hop=%d, reason=%s)`,
      targetBotName,
      hop,
      reason || '(none)'
    );

    MessageBus.getInstance().emit('message:incoming', {
      message: sourceMessage,
      history,
      botConfig: targetConfig,
      botName: targetBotName,
      platform,
      channelId,
      metadata: handoffMeta,
    });

    return {
      toolName,
      success: true,
      result: {
        transferred: true,
        targetBotName,
        reason,
        hop,
        message: `Successfully transferred conversation to ${targetBotName}. Stop responding and let the other bot take over.`,
      },
    };
  }

  // timeoutPromise replaced by withTimeout (AbortController-based) above.
}
