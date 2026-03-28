/**
 * Tool Provider interface for exposing executable tools to the AI system.
 *
 * Implementations wrap external tool registries (MCP servers, LangChain tools,
 * custom function catalogs, etc.) behind a uniform list-and-execute contract.
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** JSON Schema subset describing a tool's input parameters. */
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/** Descriptor for a single tool a provider can execute. */
export interface ToolDefinition {
  /** Machine-readable tool name (unique within the provider). */
  name: string;
  /** Human-readable description shown to the LLM / user. */
  description: string;
  /** JSON Schema describing the tool's expected input. */
  inputSchema: ToolInputSchema;
}

/** Contextual information passed alongside a tool invocation. */
export interface ToolExecutionContext {
  /** The user who triggered the tool call. */
  userId?: string;
  /** Active session identifier. */
  sessionId?: string;
  /** Maximum wall-clock milliseconds the tool may run. */
  timeout?: number;
}

/** Outcome of a single tool execution. */
export interface ToolResult {
  /** Whether the tool completed successfully. */
  success: boolean;
  /** The tool's output payload (structure is tool-specific). */
  output?: unknown;
  /** Human-readable error message when success is false. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Contract that all tool providers must implement.
 */
export interface IToolProvider {
  /**
   * List the tools this provider currently exposes.
   */
  listTools(): Promise<ToolDefinition[]>;

  /**
   * Execute a named tool with the given arguments.
   *
   * @param toolName The `name` field from one of the definitions returned by `listTools()`.
   * @param args     Key-value arguments matching the tool's `inputSchema`.
   * @param context  Optional execution context (user, session, timeout).
   */
  executeTool(
    toolName: string,
    args: Record<string, unknown>,
    context?: ToolExecutionContext
  ): Promise<ToolResult>;

  /**
   * Lightweight connectivity/readiness probe.
   */
  healthCheck(): Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }>;
}
