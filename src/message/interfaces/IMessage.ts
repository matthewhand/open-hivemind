import Debug from 'debug';

const debug = Debug('app:IMessage');

/**
 * Abstract base class representing a message in the messaging system.
 *
 * This class provides a common interface for messages across different platforms
 * (Discord, Slack, etc.) and message types (user messages, bot responses, system messages).
 *
 * @abstract
 * @example
 * ```typescript
 * class DiscordMessage extends IMessage {
 *   // Implementation for Discord-specific messages
 * }
 * ```
 */
export abstract class IMessage {
  /**
   * The text content of the message.
   * @type {string}
   */
  public content: string = "";

  /**
   * The unique identifier of the channel where this message was sent.
   * Canonical channel identifier used for routing and prioritization.
   * @type {string}
   */
  public channelId: string = "";

  /**
   * Raw platform-specific data associated with the message.
   * This can contain the original message object from the platform SDK.
   * @type {any}
   */
  public data: any;

  /**
   * The role of the message sender.
   * Common values: "user", "assistant", "system", "tool"
   * @type {string}
   */
  public role: string;

  /**
   * The platform this message originated from.
   * Common values: "discord", "slack", "telegram", "mattermost"
   * @type {string}
   */
  public platform: string = "";

  /**
   * Optional metadata associated with the message.
   * Can include custom properties like message type, priority, etc.
   * @type {any}
   * @optional
   */
  public metadata?: any;

  /**
   * Required for "tool" role messages.
   * Links this message to a specific tool call ID.
   * @type {string}
   * @optional
   */
  public tool_call_id?: string;

  /**
   * Optional for "assistant" role messages.
   * Contains tool invocation requests made by the assistant.
   * @type {any[]}
   * @optional
   */
  public tool_calls?: any[];

  /**
   * Creates a new IMessage instance.
   *
   * @param {any} data - Raw platform-specific message data
   * @param {string} role - The role of the message sender
   * @param {any} [metadata] - Optional metadata for the message
   * @param {string} [tool_call_id] - Required for tool role messages
   * @param {any[]} [tool_calls] - Optional tool calls for assistant messages
   *
   * @throws {TypeError} If attempting to instantiate IMessage directly
   */
  constructor(data: any, role: string, metadata?: any, tool_call_id?: string, tool_calls?: any[]) {
    if (new.target === IMessage) {
      throw new TypeError('Cannot construct IMessage instances directly');
    }
    this.data = data;
    this.role = role;
    this.metadata = metadata;
    this.tool_call_id = tool_call_id;
    this.tool_calls = tool_calls;
    debug('IMessage initialized with metadata:', metadata, 'tool_call_id:', tool_call_id);
  }

  /**
   * Gets the unique identifier for this message.
   *
   * @abstract
   * @returns {string} The message ID
   */
  abstract getMessageId(): string;

  /**
   * Retrieves the text content or tool response content of the message.
   *
   * For "tool" role messages, returns the content field.
   * Implementations may override this method for custom behavior.
   *
   * @returns {string} The text content of the message
   */
  getText(): string {
    if (this.role === 'tool') {
      return this.content;  // Default to content, override in implementations if needed
    }
    return this.content;
  }

  /**
   * Gets the timestamp when this message was created.
   *
   * @abstract
   * @returns {Date} The message creation timestamp
   */
  abstract getTimestamp(): Date;

  /**
   * Updates the text content of the message.
   *
   * @abstract
   * @param {string} text - The new text content
   */
  public abstract setText(text: string): void;

  /**
   * Gets the channel ID where this message was sent.
   * Canonical, provider-agnostic channel identifier.
   *
   * @abstract
   * @returns {string} The channel identifier
   */
  abstract getChannelId(): string;

  /**
   * Gets the unique identifier of the message author.
   *
   * @abstract
   * @returns {string} The author's user ID
   */
  abstract getAuthorId(): string;

  /**
   * Gets the topic/description of the channel where this message was sent.
   *
   * @abstract
   * @returns {string | null} The channel topic, or null if not available
   */
  abstract getChannelTopic(): string | null;

  /**
   * Gets all user mentions in this message as a list of provider-agnostic user IDs.
   * Implementations should normalize to canonical string IDs.
   *
   * @abstract
   * @returns {string[]} Array of user IDs mentioned in the message
   */
  abstract getUserMentions(): string[];

  /**
   * Gets all users in the channel where this message was sent.
   *
   * @abstract
   * @returns {string[]} Array of user IDs in the channel
   */
  abstract getChannelUsers(): string[];

  /**
   * Optional: Returns the guild/workspace identifier if available for the provider.
   * Default contract is to return null when not applicable.
   *
   * Concrete implementations should override to supply a canonical workspace ID where applicable.
   *
   * @returns {string | null}
   */
  getGuildOrWorkspaceId(): string | null {
    return null;
  }

  /**
   * Checks if this message is a reply to a bot message.
   *
   * @returns {boolean} True if this message is a reply to a bot
   */
  isReplyToBot(): boolean { return false; }

  /**
   * Checks if this message mentions a specific user.
   *
   * @abstract
   * @param {string} userId - The user ID to check for
   * @returns {boolean} True if the user is mentioned in this message
   */
  abstract mentionsUsers(userId: string): boolean;

  /**
   * Checks if this message was sent by a bot.
   *
   * @abstract
   * @returns {boolean} True if the message is from a bot
   */
  abstract isFromBot(): boolean;

  /**
   * Gets the display name of the message author.
   *
   * @abstract
   * @returns {string} The author's display name
   */
  abstract getAuthorName(): string;

  /**
   * Checks if this message was sent in a direct message (DM) context.
   * 
   * @returns {boolean} True if the message is a DM
   */
  isDirectMessage(): boolean { return false; }
}