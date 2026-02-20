import type { IMessage } from './IMessage';

/**
 * Interface for low-level message transport providers.
 *
 * This interface defines the contract for platform-specific message providers
 * that handle the actual sending and receiving of messages across different
 * messaging platforms (Discord, Slack, etc.).
 *
 * @interface
 * @example
 * ```typescript
 * class DiscordMessageProvider implements IMessageProvider {
 *   async sendMessage(channelId: string, message: string): Promise<string> {
 *     // Discord-specific implementation
 *   }
 * }
 * ```
 */
export interface IMessageProvider {
  /**
   * Sends a message to a specific channel.
   *
   * @param {string} channelId - The unique identifier of the target channel
   * @param {string} message - The text content to send
   * @param {string} [senderName] - Optional display name for the message sender
   * @returns {Promise<string>} A promise that resolves to the sent message's ID
   *
   * @example
   * ```typescript
   * const provider = new DiscordMessageProvider();
   * const messageId = await provider.sendMessage("123456789", "Hello, world!");
   * ```
   */
  sendMessage(channelId: string, message: string, senderName?: string): Promise<string>;

  /**
   * Retrieves all messages from a specific channel.
   *
   * @param {string} channelId - The unique identifier of the channel
   * @param {number} [limit] - Optional maximum number of messages to retrieve (provider-dependent)
   * @returns {Promise<IMessage[]>} A promise that resolves to an array of messages
   *
   * @example
   * ```typescript
   * const provider = new SlackMessageProvider();
   * const messages = await provider.getMessages("general");
   * messages.forEach(msg => console.log(msg.getText()));
   * ```
   */
  getMessages(channelId: string, limit?: number): Promise<IMessage[]>;

  /**
   * Sends a message to a channel with an optional agent name.
   *
   * This method is similar to sendMessage but provides additional flexibility
   * for specifying the active agent name that sent the message.
   *
   * @param {string} channelId - The unique identifier of the target channel
   * @param {string} message - The text content to send
   * @param {string} [active_agent_name] - Optional name of the active agent sending the message
   * @returns {Promise<string>} A promise that resolves to the sent message's ID
   *
   * @example
   * ```typescript
   * const provider = new DiscordMessageProvider();
   * const messageId = await provider.sendMessageToChannel(
   *   "123456789",
   *   "Processing your request...",
   *   "AI Assistant"
   * );
   * ```
   */
  sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string>;

  /**
   * Gets the unique client identifier for this provider.
   *
   * This is typically used to identify the bot or application instance
   * within the messaging platform.
   *
   * @returns {string} The client ID for this provider
   *
   * @example
   * ```typescript
   * const provider = new SlackMessageProvider();
   * console.log(provider.getClientId()); // "slack-bot-12345"
   * ```
   */
  getClientId(): string;

  /**
   * Gets the owner/creator of a message forum (channel, group, etc.)
   *
   * This method is used for permission checking when using MCP tools.
   *
   * @param {string} forumId - The unique identifier of the forum (channel, group, etc.)
   * @returns {Promise<string>} A promise that resolves to the user ID of the forum owner
   */
  getForumOwner(forumId: string): Promise<string>;

  /**
   * Triggers a typing indicator in the channel.
   * Optional method, as not all providers support it.
   */
  sendTyping?(channelId: string, senderName?: string, threadId?: string): Promise<void>;
}
