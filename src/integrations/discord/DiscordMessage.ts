// src/integrations/discord/DiscordMessage.ts
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Collection, GuildMember, Message, TextChannel, User } from 'discord.js';

const debug = Debug('app:DiscordMessage');

/**
 * Discord-specific implementation of the IMessage interface.
 * 
 * This class wraps the Discord.js Message object to provide a unified interface
 * for Discord messages while maintaining compatibility with the IMessage contract.
 * It handles Discord-specific features like mentions, channel topics, and message editing.
 * 
 * @implements {IMessage}
 * @example
 * ```typescript
 * const discordMessage = new DiscordMessage(message);
 * console.log(discordMessage.getText()); // "Hello from Discord!"
 * console.log(discordMessage.getAuthorName()); // "username#1234"
 * ```
 */
export default class DiscordMessage implements IMessage {
  /**
   * The text content of the Discord message.
   * @type {string}
   */
  public content: string;

  /**
   * The Discord channel ID where this message was sent.
   * @type {string}
   */
  public channelId: string;

  /**
   * Raw Discord.js message data.
   * Contains the original Message object from discord.js.
   * @type {any}
   */
  public data: any;

  /**
   * The role of the message sender (user, assistant, system, tool).
   * @type {string}
   */
  public role: string;

  /**
   * The underlying Discord.js Message object.
   * @private
   * @type {Message<boolean>}
   */
  private readonly message: Message<boolean>;

  /**
   * The message that this message is replying to, if any.
   * @private
   * @type {Message<boolean> | null}
   */
  private readonly repliedMessage: Message<boolean> | null;

  /**
   * Creates a new DiscordMessage instance.
   * 
   * @param {Message<boolean>} message - The raw message object from Discord.js
   * @param {Message<boolean> | null} [repliedMessage=null] - The message this message is replying to, if any
   * 
   * @example
   * ```typescript
   * const message = new DiscordMessage(discordJsMessage);
   * const reply = new DiscordMessage(replyMessage, originalMessage);
   * ```
   */
  constructor(message: Message<boolean>, repliedMessage: Message<boolean> | null = null) {
    this.message = message;
    this.repliedMessage = repliedMessage;
    this.content = message.content || '[No content]'; // Ensure fallback for empty content
    this.channelId = message.channelId;
    this.data = message.content;
    this.role = ''; // Customize based on application needs

    const author = `${message.author.username}#${message.author.discriminator} (${message.author.id})`;
    debug(`DiscordMessage: [ID: ${message.id}] by ${author}`); // Shortened log with author info
  }

  /**
   * Gets the unique Discord message ID.
   * 
   * @returns {string} The Discord message ID
   */
  getMessageId(): string {
    const messageId = this.message.id || 'unknown';
    debug('Getting message ID: ' + messageId);
    return messageId;
  }

  /**
   * Gets the text content of the Discord message.
   * 
   * @returns {string} The message text content
   */
  getText(): string {
    debug('Getting message text: ' + this.content);
    return this.content;
  }

  /**
   * Gets the timestamp when this Discord message was created.
   * 
   * @returns {Date} The message creation timestamp
   */
  public getTimestamp(): Date {
    debug('Getting timestamp for message: ' + this.message.id);
    return this.message.createdAt;
  }

  /**
   * Updates the text content of the Discord message.
   * 
   * Note: This will attempt to edit the original Discord message if it's editable.
   * 
   * @param {string} text - The new text content
   */
  public setText(text: string): void {
    debug('Setting message text: ' + text);
    this.content = text;
    if (this.message.editable) {
      this.message.edit(text).catch((error) => {
        console.error(`Failed to edit message ${this.message.id}:`, error);
      });
    } else {
      console.warn(`Message ${this.message.id} is not editable.`);
    }
  }

  /**
   * Gets the Discord channel ID.
   * 
   * @returns {string} The Discord channel ID
   */
  getChannelId(): string {
    debug('Getting channel ID: ' + this.channelId);
    return this.channelId;
  }

  /**
   * Gets the topic/description of the Discord channel.
   * 
   * @returns {string | null} The channel topic, or null if not available or not a text channel
   */
  getChannelTopic(): string | null {
    debug('Getting channel topic for channel: ' + this.channelId);
    try {
      // Handle both real TextChannel and mock objects
      const channel = this.message.channel as any;
      if (channel && channel.topic !== undefined) {
        return channel.topic || null;
      }
      if (channel instanceof TextChannel) {
        return channel.topic || null;
      }
      return null;
    } catch (error) {
      debug('Error getting channel topic:', error);
      return null;
    }
  }

  /**
   * Gets the Discord user ID of the message author.
   * 
   * @returns {string} The author's Discord user ID
   */
  getAuthorId(): string {
    debug('Getting author ID: ' + this.message.author.id);
    return this.message.author.id;
  }

  /**
   * Gets all user mentions in this Discord message.
   * 
   * @returns {string[]} Array of Discord user IDs mentioned in the message
   */
  getUserMentions(): string[] {
    debug('Getting user mentions from message: ' + this.message.id);
    try {
      const mentions = this.message.mentions?.users?.map(user => user.id) || [];
      if (!mentions) {
        return [];
      }

      // Handle both real Collection and mock objects
      if (typeof mentions.map === 'function') {
        return mentions.map((user: any) => user.id);
      }
      if (typeof mentions === 'object' && !Array.isArray(mentions)) {
        return Object.values(mentions).map((user: any) => user.id);
      }
      return [];
    } catch (error) {
      debug('Error getting user mentions:', error);
      return [];
    }
  }
  
  /**
   * Gets all users in the Discord channel.
   * 
   * @returns {string[]} Array of Discord user IDs in the channel
   */
  getChannelUsers(): string[] {
    debug('Fetching users from channel: ' + this.channelId);
    try {
      const channel = this.message.channel as TextChannel;
      if (!channel || !channel.members) {
        return [];
      }

      const members = channel.members;

      if (members instanceof Collection) {
        return members.map((member: any) => member.user?.id).filter(Boolean);
      } else if (Array.isArray(members)) {
        return (members as Array<{user?: {id: string}}>)
          .map((member) => member.user?.id)
          .filter((id): id is string => id !== undefined);
      } else if (typeof members === 'object' && members !== null) {
        return Object.values(members)
          .map((member: any) => member.user?.id)
          .filter(Boolean);
      }

      return [];
    } catch (error) {
      debug('Error getting channel users:', error);
      return [];
    }
  }

  /**
   * Gets the display name of the Discord message author.
   * 
   * @returns {string} The author's Discord username
   */
  getAuthorName(): string {
    const authorName = this.message.author.username || 'Unknown Author';
    debug('Author name: ' + authorName);
    return authorName;
  }

  /**
   * Checks if this Discord message was sent by a bot.
   * 
   * @returns {boolean} True if the message is from a bot user
   */
  isFromBot(): boolean {
    debug('Checking if message is from a bot');
    return this.message.author?.bot || false;
  }

  /**
   * Checks if this Discord message is a reply to a bot message.
   * 
   * @returns {boolean} True if this message is a reply to a bot
   */
  isReplyToBot(): boolean {
    if (this.repliedMessage) {
      const isBot = this.repliedMessage.author?.bot || false;
      debug(`Is reply to bot: ${isBot}`);
      return isBot;
    }
    debug('No replied message found.');
    return false;
  }

  /**
   * Checks if this Discord message mentions a specific user.
   * 
   * @param {string} userId - The Discord user ID to check for
   * @returns {boolean} True if the user is mentioned in this message
   */
  mentionsUsers(userId: string): boolean {
    debug('Checking if message mentions user: ' + userId);
    if (!this.message.mentions || !this.message.mentions.users) {
        return false;
    }
    return this.message.mentions.users.has(userId);
  }

  /**
   * Gets the underlying Discord.js Message object.
   * 
   * @returns {Message<boolean>} The original Discord.js message
   */
  getOriginalMessage(): Message<boolean> {
    return this.message;
  }

  /**
   * Retrieves the Discord message being referenced (e.g., in replies).
   * 
   * @returns {Promise<IMessage | null>} The referenced message as an IMessage, or null if none exists
   */
  public async getReferencedMessage(): Promise<IMessage | null> {
    if (this.message.reference && this.message.reference.messageId) {
      try {
        const referencedMsg = await this.message.channel.messages.fetch(this.message.reference.messageId);
        return new DiscordMessage(referencedMsg);
      } catch (error: any) {
        console.error(`Failed to fetch referenced message: ${error.message}`);
        return null;
      }
    }
    return null;
  }
}
