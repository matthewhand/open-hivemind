import { type Config } from 'convict';

export interface IProvider<TConfig = any> {
  /**
   * Unique identifier for the provider (e.g., 'slack', 'discord', 'openai').
   */
  id: string;

  /**
   * Display label for the provider (e.g., 'Slack', 'Discord', 'OpenAI').
   */
  label: string;

  /**
   * Type of provider.
   */
  type: 'messenger' | 'llm';

  /**
   * Returns the Convict schema object for this provider's configuration.
   */
  getSchema(): any;

  /**
   * Returns the Convict configuration instance.
   */
  getConfig(): Config<TConfig>;

  /**
   * Returns a list of sensitive configuration keys (e.g., tokens, secrets) that should be redacted.
   */
  getSensitiveKeys(): string[];

  /**
   * Documentation URL for the provider.
   */
  docsUrl?: string;

  /**
   * Help text for configuring the provider.
   */
  helpText?: string;
}

export interface IMessageProvider<TConfig = any> extends IProvider<TConfig> {
  type: 'messenger';

  /**
   * Returns the status of the provider (e.g., connected bots).
   */
  getStatus(): Promise<any>;

  /**
   * Returns a list of configured bot names.
   */
  getBotNames(): string[];

  /**
   * Returns detailed bot information.
   */
  getBots(): Promise<any[]>;

  /**
   * Adds a new bot configuration.
   */
  addBot(config: any): Promise<void>;

  /**
   * Reloads the provider configuration.
   */
  reload?(): Promise<any>;
}

export interface ILLMProvider<TConfig = any> extends IProvider<TConfig> {
  type: 'llm';
}

/**
 * Memory provider interface for persistent AI memory.
 * Implementations: Mem0, Zep, Letta memory, etc.
 */
export interface IMemoryProvider {
  /** Provider identifier */
  id: string;
  /** Display name */
  label: string;
  /** Provider type */
  type: 'memory';

  /** Add memories from conversation messages */
  add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, unknown> }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, unknown> }>;
  }>;

  /** Search memories by natural language query */
  search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, unknown> }>;
  }>;

  /** Get all memories for a user/agent */
  getAll(options?: {
    userId?: string;
    agentId?: string;
  }): Promise<{ results: Array<{ id: string; memory: string }> }>;

  /** Get a specific memory by ID */
  get(memoryId: string): Promise<{ id: string; memory: string } | null>;

  /** Update a memory's content */
  update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }>;

  /** Delete a specific memory */
  delete(memoryId: string): Promise<void>;

  /** Delete all memories for a user/agent */
  deleteAll(options?: { userId?: string; agentId?: string }): Promise<void>;
}
