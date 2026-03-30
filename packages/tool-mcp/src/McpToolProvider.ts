import Debug from 'debug';
import type {
  IToolProvider,
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
} from '@hivemind/shared-types';
import {
  getCircuitBreaker,
  type CircuitBreaker as CircuitBreakerType,
} from '@common/CircuitBreaker';
import { withTimeout } from '@common/withTimeout';
import type { McpToolCallResponse, McpToolProviderConfig, McpToolsListResponse } from './types';

const debug = Debug('app:tool-mcp');

/** Default timeout for MCP tool operations (10 seconds). */
const DEFAULT_MCP_TIMEOUT_MS = 10_000;

export class McpToolProvider implements IToolProvider {
  public readonly name: string;
  private config: McpToolProviderConfig;
  private client: any = null;
  private cachedTools: ToolDefinition[] = [];
  private readonly circuitBreaker: CircuitBreakerType;

  constructor(config: McpToolProviderConfig) {
    this.config = {
      timeout: 30_000,
      autoReconnect: true,
      transport: 'sse',
      ...config,
    };
    this.name = config.name || 'mcp';
    this.circuitBreaker = getCircuitBreaker({
      name: `mcp-${this.name}`,
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      halfOpenMaxAttempts: 3,
    });
  }

  public async listTools(): Promise<ToolDefinition[]> {
    await this.ensureConnected();

    return this.circuitBreaker.execute(async () => {
      try {
        debug(`Listing tools from MCP server: ${this.name}`);
        const timeoutMs = this.config.timeout ?? DEFAULT_MCP_TIMEOUT_MS;
        const response: McpToolsListResponse = await withTimeout(
          () => this.client.listTools(),
          timeoutMs,
          `MCP listTools (${this.name})`
        );

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
    });
  }

  public async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    _context?: ToolExecutionContext
  ): Promise<ToolResult> {
    await this.ensureConnected();

    return this.circuitBreaker.execute(async () => {
      try {
        debug(`Executing tool ${toolName} on MCP server ${this.name}`);

        const timeoutMs = this.config.timeout ?? DEFAULT_MCP_TIMEOUT_MS;
        const response: McpToolCallResponse = await withTimeout(
          () =>
            this.client.callTool({
              name: toolName,
              arguments: args,
            }),
          timeoutMs,
          `MCP executeTool ${toolName} (${this.name})`
        );

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
    });
  }

  public async healthCheck(): Promise<{
    status: 'ok' | 'error';
    details?: Record<string, unknown>;
  }> {
    try {
      await this.ensureConnected();
      await this.client.listTools();
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        details: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      const { Client } = require('@modelcontextprotocol/sdk');

      this.client = new Client({
        name: `Open-Hivemind-${this.name}`,
        version: '1.0.0',
      });

      debug(
        `Connecting to MCP server ${this.name} at ${this.config.serverUrl} (${this.config.transport})`
      );

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

  public async disconnect(): Promise<void> {
    if (this.client) {
      debug(`Disconnecting from MCP server ${this.name}`);
      this.client = null;
      this.cachedTools = [];
    }
  }
}
