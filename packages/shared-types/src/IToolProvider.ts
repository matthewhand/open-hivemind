/**
 * Tool Provider interface for exposing external tools to bots.
 *
 * Tool providers connect to external systems (MCP servers, HTTP APIs, etc.)
 * and make their capabilities available as callable tools during bot
 * conversations.
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Describes a single tool that can be invoked. */
export interface ToolDefinition {
  /** Unique name used to invoke the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description?: string;
  /** JSON Schema describing the expected input arguments */
  inputSchema?: Record<string, unknown>;
  /** Name of the server/provider that owns this tool */
  serverName?: string;
}

/** Result returned after executing a tool. */
export interface ToolResult {
  /** The output content from the tool execution */
  content: unknown;
  /** Whether the tool execution encountered an error */
  isError?: boolean;
  /** Optional metadata about the execution */
  metadata?: Record<string, unknown>;
}

/** Context passed alongside tool execution requests. */
export interface ToolExecutionContext {
  /** The bot requesting the tool execution */
  botName?: string;
  /** Message provider the request originated from */
  messageProvider?: string;
  /** Forum/channel ID for guard checks */
  forumId?: string;
  /** Owner of the forum for permission checks */
  forumOwnerId?: string;
  /** User ID of the person who triggered the tool call */
  userId?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that all tool providers must implement.
 *
 * Mirrors the common surface area across MCP servers, HTTP tool endpoints,
 * and other future tool integration patterns: list tools, execute a tool,
 * and check health.
 */
export interface IToolProvider {
  /** Provider name for identification */
  name: string;

  /**
   * Discover available tools from the provider.
   * @returns Array of tool definitions exposed by this provider.
   */
  listTools(): Promise<ToolDefinition[]>;

  /**
   * Execute a specific tool by name.
   * @param toolName Name of the tool to execute.
   * @param args     Arguments to pass to the tool.
   * @param context  Optional execution context for guard/permission checks.
   * @returns The result produced by the tool.
   */
  executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult>;

  /**
   * Lightweight connectivity/readiness probe.
   * @returns `true` when the provider backend is reachable.
   */
  healthCheck(): Promise<boolean>;
}
