// src/integrations/discord/DiscordMessage.ts
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Collection, Message, TextChannel, User, GuildMember } from 'discord.js';
import { HivemindError, ErrorUtils } from '../../types/errors';

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
export class DiscordMessage implements IMessage {
  static DiscordMessage = DiscordMessage;
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
   * @type {Message<boolean>}
   */
  public data: Message<boolean>;

  /**
   * The role of the message sender (user, assistant, system, tool).
   * @type {string}
   */
  public role: string;

  /**
   * The platform this message originated from.
   * @type {string}
   */
  public platform: string;

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
    this.data = message;
    this.role = ''; // Customize based on application needs
    this.platform = 'discord';

    const author = message.author;
    const authorString = `${author.username ?? 'unknown'}#${author.discriminator ?? '0000'} (${author.id ?? 'unknown'})`;
    debug(`DiscordMessage: [ID: ${message.id}] by ${authorString}`); // Shortened log with author info
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
  public setText(text: string): Promise<void> {
    debug('Setting message text: ' + text);
    this.content = text;
    if (this.message.editable) {
      return this.message.edit(text).then(() => {
        // use debug to avoid noisy console during tests
        debug(`Message ${this.message.id} edited successfully.`);
      }).catch((error: HivemindError) => {
        debug(`Failed to edit message ${this.message.id}: ${ErrorUtils.getMessage(error)}`);
        throw error;
      });
    } else {
      // downgrade to debug to silence console.warn in tests
      debug(`Message ${this.message.id} is not editable.`);
      return Promise.resolve();
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
      const channel = this.message.channel;
      if (channel instanceof TextChannel) {
        return channel.topic || null;
      }
      // Handle mock objects that might have a topic property
      if (channel && typeof channel === 'object' && 'topic' in channel) {
        return (channel as { topic?: string }).topic || null;
      }
      return null;
    } catch (error: HivemindError) {
      debug('Error getting channel topic:', ErrorUtils.getMessage(error));
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
      const users = this.message.mentions?.users;

      if (!users) return [];

      if (users instanceof Collection) {
        return Array.from(users.values())
          .map((user: User) => user.id)
          .filter((id): id is string => typeof id === 'string');
      }

      // Handle mock objects that might be plain arrays or objects
      const usersAny = users as unknown;
      
      // Plain array of users or IDs
      if (Array.isArray(usersAny)) {
        return (usersAny as Array<User | string>)
          .map((u) => (typeof u === 'string' ? u : (u as User)?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      // Some tests may mock mentions.users as a plain object map
      if (typeof usersAny === 'object' && usersAny !== null) {
        return Object.values(usersAny as Record<string, User | string>)
          .map((u) => (typeof u === 'string' ? u : (u as User)?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      return [];
    } catch (error: HivemindError) {
      debug('Error getting user mentions:', ErrorUtils.getMessage(error));
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
      const channel = this.message.channel;
      if (!channel) return [];

      // Try to get members from guild channel
      const guildChannel = channel as TextChannel & {
        members?: Collection<string, GuildMember> | Array<GuildMember | string> | Record<string, GuildMember | string>
      };
      
      const members = guildChannel.members;
      if (!members) return [];

      if (members instanceof Collection) {
        return Array.from(members.values())
          .map((m: GuildMember) => m.user?.id)
          .filter((id): id is string => typeof id === 'string');
      }

      // Handle mock objects
      const membersAny = members as unknown;

      // Array of members
      if (Array.isArray(membersAny)) {
        return (membersAny as Array<GuildMember | string>)
          .map((m) => (typeof m === 'string' ? m : (m as GuildMember)?.user?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      // Plain object map for test mocks
      if (typeof membersAny === 'object' && membersAny !== null) {
        // Handle object with map function (test mocks)
        const mockCollection = membersAny as { map?: (fn: (member: GuildMember) => string | undefined) => string[] };
        if (typeof mockCollection.map === 'function') {
          const mapped = mockCollection.map((m: GuildMember) => m?.user?.id);
          return (Array.isArray(mapped) ? mapped : []).filter((id): id is string => typeof id === 'string');
        }

        // Handle plain object
        return Object.values(membersAny as Record<string, GuildMember | string>)
          .map((m) => (typeof m === 'string' ? m : (m as GuildMember)?.user?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      return [];
    } catch (error: HivemindError) {
      debug('Error getting channel users:', ErrorUtils.getMessage(error));
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
   * Returns the Discord guild ID (workspace) if available, else null.
   * Satisfies IMessage.getGuildOrWorkspaceId() for cross-platform routing.
   */
  getGuildOrWorkspaceId(): string | null {
    try {
      // message.guild may be undefined in DMs or certain mocks
      const guildId = this.message?.guild?.id ?? null;
      return guildId;
    } catch {
      return null;
    }
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
      } catch (error: HivemindError) {
        // use debug instead of console.error to reduce test noise
        debug(`Failed to fetch referenced message: ${ErrorUtils.getMessage(error)}`);
        return null;
      }
    }
    return null;
  }

  /**
   * Checks if the message has attachments.
   * @returns {boolean} True if the message has attachments, false otherwise.
   */
  hasAttachments(): boolean {
    return this.message.attachments.size > 0;
  }
}

export default DiscordMessage;
