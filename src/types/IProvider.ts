export interface IProvider<TConfig = unknown> {
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
   * Returns the configuration schema object for this provider.
   */
  getSchema(): Record<string, unknown>;

  /**
   * Returns the configuration instance or properties.
   */
  getConfig(): TConfig | Record<string, unknown>;

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

export interface IMessageProvider<TConfig = unknown> extends IProvider<TConfig> {
  type: 'messenger';

  /**
   * Returns the status of the provider (e.g., connected bots).
   */
  getStatus(): Promise<Record<string, unknown>>;

  /**
   * Returns a list of configured bot names.
   */
  getBotNames(): string[];

  /**
   * Returns detailed bot information.
   */
  getBots(): Promise<Record<string, unknown>[]>;

  /**
   * Adds a new bot configuration.
   */
  addBot(config: Record<string, unknown>): Promise<void>;

  /**
   * Reloads the provider configuration.
   */
  reload?(): Promise<unknown>;

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
  getMessages(channelId: string, limit?: number): Promise<unknown[]>;

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

export interface ILLMProvider<TConfig = unknown> extends IProvider<TConfig> {
  type: 'llm';
}

/**
 * Memory provider interface — re-exported from the canonical shared-types
 * package for backward compatibility. New code should import directly from
 * '@hivemind/shared-types'.
 */
export type {
  IMemoryProvider,
  MemoryEntry,
  MemorySearchResult,
  MemoryScopeOptions,
} from '@hivemind/shared-types';

/**
 * Tool provider interface — re-exported from shared-types for convenience.
 */
export type {
  IToolProvider,
  ToolDefinition,
  ToolInputSchema,
  ToolResult,
  ToolExecutionContext,
} from '@hivemind/shared-types';
