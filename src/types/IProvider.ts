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

  /**
   * Sends a message to a specific channel.
   * @param channelId - The unique identifier of the target channel
   * @param message - The text content to send
   * @param senderName - Optional display name for the message sender
   * @returns A promise that resolves to the sent message's ID
   */
  sendMessage(channelId: string, message: string, senderName?: string): Promise<string>;

  /**
   * Retrieves messages from a specific channel.
   * @param channelId - The unique identifier of the channel
   * @param limit - Optional maximum number of messages to retrieve
   * @returns A promise that resolves to an array of messages
   */
  getMessages(channelId: string, limit?: number): Promise<any[]>;

  /**
   * Sends a message to a channel with an optional agent name.
   * @param channelId - The unique identifier of the target channel
   * @param message - The text content to send
   * @param active_agent_name - Optional name of the active agent sending the message
   * @returns A promise that resolves to the sent message's ID
   */
  sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string>;

  /**
   * Gets the unique client identifier for this provider.
   * @returns The client ID for this provider
   */
  getClientId(): string;

  /**
   * Gets the owner/creator of a message forum (channel, group, etc.)
   * @param forumId - The unique identifier of the forum (channel, group, etc.)
   * @returns A promise that resolves to the user ID of the forum owner
   */
  getForumOwner(forumId: string): Promise<string>;
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
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
  }>;

  /** Search memories by natural language query */
  search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
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

/**
 * Tool provider interface for external tool integrations.
 * Implementations: MCP servers, custom tool providers, etc.
 */
export interface IToolProvider {
  /** Provider identifier */
  id: string;
  /** Display name */
  label: string;
  /** Provider type */
  type: 'tool';

  /** List available tools */
  listTools(): Promise<Array<{ name: string; description?: string }>>;

  /** Execute a specific tool by name */
  executeTool(
    toolName: string,
    params?: Record<string, any>
  ): Promise<{ result: any; error?: string }>;

  /** Check if provider is connected and healthy */
  healthCheck(): Promise<{ healthy: boolean; details?: string }>;
}
