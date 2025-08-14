import { IMessage } from '@message/interfaces/IMessage';

/**
 * Synthetic message implementation for system-generated responses.
 *
 * This class creates artificial messages that appear to come from the system
 * rather than from users. It's primarily used for idle responses, system
 * notifications, and automated messages that need to integrate seamlessly
 * with the existing message flow.
 *
 * @implements {IMessage}
 * @example
 * ```typescript
 * const original = new DiscordMessage(discordMessage);
 * const synthetic = new SyntheticMessage(original, "This is an automated response");
 * console.log(synthetic.getAuthorName()); // "System"
 * console.log(synthetic.isFromBot()); // true
 * ```
 */
export class SyntheticMessage extends IMessage {
  /**
   * The text content of the synthetic message.
   * @type {string}
   */
  public content: string = "";

  /**
   * The channel ID where this synthetic message appears.
   * @type {string}
   */
  public channelId: string = "";

  /**
   * Original message data preserved from the source message.
   * @type {any}
   */
  public data: any;

  /**
   * The role of the message sender, always "system" for synthetic messages.
   * @type {string}
   */
  public role: string = "system";

  /**
   * Optional metadata inherited from the original message.
   * @type {any}
   * @optional
   */
  public metadata?: any;

  /**
   * Tool call ID, not used in synthetic messages.
   * @type {string}
   * @optional
   */
  public tool_call_id?: string;

  /**
   * Tool calls array, not used in synthetic messages.
   * @type {any[]}
   * @optional
   */
  public tool_calls?: any[];

  /**
   * Unique identifier for this synthetic message.
   * @private
   * @type {string}
   */
  private messageId: string;

  /**
   * Internal text storage.
   * @private
   * @type {string}
   */
  private text: string;

  /**
   * Fixed author ID for system messages.
   * @private
   * @type {string}
   */
  private authorId: string;

  /**
   * Original channel ID from the source message.
   * @private
   * @type {string}
   */
  private originalChannelId: string;

  /**
   * Fixed author name for system messages.
   * @private
   * @type {string}
   */
  private authorName: string;

  /**
   * Channel topic inherited from the original message.
   * @private
   * @type {string | null}
   */
  private channelTopic: string | null;

  /**
   * User mentions, always empty for synthetic messages.
   * @private
   * @type {string[]}
   */
  private userMentions: string[];

  /**
   * Channel users inherited from the original message.
   * @private
   * @type {string[]}
   */
  private channelUsers: string[];

  /**
   * Creation timestamp for this synthetic message.
   * @private
   * @type {Date}
   */
  private timestamp: Date;

  /**
   * Creates a new synthetic message based on an original message.
   *
   * @param {IMessage} originalMessage - The original message to base this synthetic message on
   * @param {string} syntheticText - The text content for this synthetic message
   *
   * @example
   * ```typescript
   * const original = new DiscordMessage(discordMessage);
   * const synthetic = new SyntheticMessage(original, "System notification: Server restarting");
   * ```
   */
  constructor(originalMessage: IMessage, syntheticText: string) {
    super(originalMessage.data, 'system', originalMessage.metadata);
    this.originalChannelId = originalMessage.getChannelId();
    this.content = syntheticText;
    this.data = originalMessage.data;
    this.metadata = originalMessage.metadata;
    this.messageId = `synthetic-${this.originalChannelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.text = syntheticText;
    this.authorId = 'idle_response_system';
    this.authorName = 'System';
    this.channelTopic = originalMessage.getChannelTopic();
    this.userMentions = [];
    this.channelUsers = originalMessage.getChannelUsers();
    this.timestamp = new Date();
  }

  /**
   * Gets the unique identifier for this synthetic message.
   *
   * @returns {string} A unique message ID prefixed with "synthetic"
   */
  getMessageId(): string {
    return this.messageId;
  }

  /**
   * Gets the text content of this synthetic message.
   *
   * @returns {string} The message text
   */
  getText(): string {
    return this.text;
  }

  /**
   * Updates the text content of this synthetic message.
   *
   * @param {string} text - The new text content
   */
  setText(text: string): void {
    this.text = text;
    this.content = text;
  }

  /**
   * Gets the channel ID where this synthetic message appears.
   *
   * @returns {string} The original channel ID
   */
  getChannelId(): string {
    return this.originalChannelId;
  }

  /**
   * Gets the author ID for this synthetic message.
   *
   * @returns {string} Always returns 'idle_response_system'
   */
  getAuthorId(): string {
    return this.authorId;
  }

  /**
   * Gets the channel topic inherited from the original message.
   *
   * @returns {string | null} The channel topic or null if not available
   */
  getChannelTopic(): string | null {
    return this.channelTopic;
  }

  /**
   * Gets user mentions in this synthetic message.
   *
   * @returns {string[]} Always returns an empty array for synthetic messages
   */
  getUserMentions(): string[] {
    return this.userMentions;
  }

  /**
   * Gets users in the channel inherited from the original message.
   *
   * @returns {string[]} Array of user IDs in the channel
   */
  getChannelUsers(): string[] {
    return this.channelUsers;
  }

  /**
   * Gets the creation timestamp for this synthetic message.
   *
   * @returns {Date} The message creation time
   */
  getTimestamp(): Date {
    return this.timestamp;
  }

  /**
   * Checks if this message is a reply to a bot.
   *
   * @returns {boolean} Always returns false for synthetic messages
   */
  isReplyToBot(): boolean {
    return false;
  }

  /**
   * Checks if this message mentions a specific user.
   *
   * @param {string} userId - The user ID to check for
   * @returns {boolean} Always returns false for synthetic messages
   */
  mentionsUsers(_userId: string): boolean {
    return false;
  }

  /**
   * Checks if this message is from a bot.
   *
   * @returns {boolean} Always returns true for synthetic messages
   */
  isFromBot(): boolean {
    return true;
  }

  /**
   * Gets the author name for this synthetic message.
   *
   * @returns {string} Always returns 'System'
   */
  getAuthorName(): string {
    return this.authorName;
  }
}