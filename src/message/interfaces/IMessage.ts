import Debug from 'debug';

const debug = Debug('app:IMessage');

/**
 * Abstract class representing a standardized message format.
 * This class is intended to be extended with specific implementations as needed.
 */
export abstract class IMessage {
  public content: string = "";  // Text content
  public channelId: string = "";  // Channel ID
  public data: any;               // Raw data associated with the message
  public role: string;            // e.g. "user", "assistant", etc.
  public metadata?: any;          // Optional extra metadata (e.g., context_variables, agent info)

  constructor(data: any, role: string, metadata?: any) {
    if (new.target === IMessage) {
      throw new TypeError('Cannot construct IMessage instances directly');
    }
    this.data = data;
    this.role = role;
    this.metadata = metadata;
    debug('IMessage initialized with metadata:', metadata);
  }

  /**
   * Retrieves the message ID.
   * @returns {string} The message ID.
   */
  abstract getMessageId(): string;

  /**
   * Retrieves the text content of the message.
   * @returns {string} The text content.
   */
  abstract getText(): string;

  /**
   * Retrieves the timestamp of the message.
   * @returns {Date} The message timestamp.
   */
  abstract getTimestamp(): Date;
  
  /**
   * Sets the text content of the message.
   * @param {string} text - The new text content for the message.
   */
  public abstract setText(text: string): void;

  /**
   * Retrieves the channel ID where the message was sent.
   * @returns {string} The channel ID.
   */
  abstract getChannelId(): string;

  /**
   * Retrieves the author ID of the message.
   * @returns {string} The author ID.
   */
  abstract getAuthorId(): string;

  /**
   * Retrieves the topic of the channel.
   * @returns {string | null} The channel topic, or null if not available.
   */
  abstract getChannelTopic(): string | null;

  /**
   * Retrieves the users mentioned in the message.
   * @returns {string[]} Array of mentioned user IDs.
   */
  abstract getUserMentions(): string[];

  /**
   * Retrieves the users in the channel.
   * @returns {string[]} Array of user IDs in the channel.
   */
  abstract getChannelUsers(): string[];

  /**
   * Checks if the message is a reply to the bot.
   * @returns {boolean} True if the message is a reply to the bot, false otherwise.
   */
  isReplyToBot(): boolean {
    return false;
  }

  /**
   * Checks if the message mentions a specific user.
   * @param {string} userId - The ID of the user to check for mentions.
   * @returns {boolean} True if the user is mentioned, false otherwise.
   */
  abstract mentionsUsers(userId: string): boolean;

  /**
   * Checks if the message is from a bot.
   * @returns {boolean} True if the message is from a bot, false otherwise.
   */
  abstract isFromBot(): boolean;

  /**
   * Retrieves the author's name.
   * @returns {string} The author's name.
   */
  abstract getAuthorName(): string;
}
