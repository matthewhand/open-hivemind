// src/integrations/discord/DiscordMessage.ts
import Debug from 'debug';
import { Collection, TextChannel, type GuildMember, type Message, type User } from 'discord.js';
import type { IMessage } from '@hivemind/shared-types';

const debug = Debug('app:DiscordMessage');

/**
 * Simple error utilities for the adapter package.
 * This replaces the dependency on @src/types/errors.
 */
const ErrorUtils = {
  getMessage: (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
  },
};

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
   * Metadata for cross-platform compatibility.
   * Includes replyTo information for reply detection.
   * @type {any}
   */
  public metadata: any;

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
    // Role calculation:
    // If the author is THIS bot (the client user), role is 'assistant'.
    // Everyone else (humans AND other bots) is 'user'.
    this.role = message.author.id === message.client?.user?.id ? 'assistant' : 'user';
    this.platform = 'discord';

    // Populate metadata for reply detection
    if (repliedMessage) {
      this.metadata = {
        replyTo: {
          userId: repliedMessage.author?.id || null,
          username: repliedMessage.author?.username || null,
          messageId: repliedMessage.id || null,
          isBot: repliedMessage.author?.bot || false,
        },
      };
    } else {
      this.metadata = {};
    }

    const author = message.author;
    const authorString = `${author.username ?? 'unknown'}#${author.discriminator ?? '0000'} (${author.id ?? 'unknown'})`;
    debug(
      `DiscordMessage: [ID: ${message.id}] by ${authorString}${repliedMessage ? ` (reply to ${repliedMessage.author?.id})` : ''}`
    );
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
    const text = String(this.content ?? '');
    const previewMax = 60;
    const normalized = text.replace(/\s+/g, ' ').trim();
    const preview =
      normalized.length > previewMax ? `${normalized.slice(0, previewMax)}...` : normalized;
    debug(`Getting message text (len=${text.length}): ${preview}`);
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
      return this.message
        .edit(text)
        .then(() => {
          // use debug to avoid noisy console during tests
          debug(`Message ${this.message.id} edited successfully.`);
        })
        .catch((error: unknown) => {
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
    } catch (error: unknown) {
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

      if (!users) {
        return [];
      }

      if (users instanceof Collection) {
        return Array.from(users.values())
          .map((user: User) => user.id)
          .filter((id): id is string => typeof id === 'string');
      }

      // Handle mock objects that might be plain arrays or objects
      const usersAny = users as unknown;

      // Plain array of users or IDs
<<<<<<< HEAD:src/integrations/discord/DiscordMessage.ts
      if (Array.isArray(users)) {
        return (users)
          .map((u) => (typeof u === 'string' ? u : u?.id))
          .filter((id: any): id is string => typeof id === 'string');
=======
      if (Array.isArray(usersAny)) {
        return (usersAny as Array<User | string>)
          .map((u) => (typeof u === 'string' ? u : (u as User)?.id))
          .filter((id): id is string => typeof id === 'string');
>>>>>>> origin/main:packages/adapter-discord/src/DiscordMessage.ts
      }

      // Some tests may mock mentions.users as a plain object map
      if (typeof usersAny === 'object' && usersAny !== null) {
        return Object.values(usersAny as Record<string, User | string>)
          .map((u) => (typeof u === 'string' ? u : (u as User)?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      return [];
    } catch (error: unknown) {
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
      if (!channel) {
        return [];
      }

      // Try to get members from guild channel
      const guildChannel = channel as TextChannel & {
        members?:
          | Collection<string, GuildMember>
          | Array<GuildMember | string>
          | Record<string, GuildMember | string>;
      };

      const members = guildChannel.members;
      if (!members) {
        return [];
      }

      if (members instanceof Collection) {
        return Array.from(members.values())
          .map((m: GuildMember) => m.user?.id)
          .filter((id): id is string => typeof id === 'string');
      }

      // Handle mock objects
      const membersAny = members as unknown;

      // Array of members
<<<<<<< HEAD:src/integrations/discord/DiscordMessage.ts
      if (Array.isArray(members)) {
        return (members)
          .map((m) => (typeof m === 'string' ? m : m?.user?.id))
          .filter((id: any): id is string => typeof id === 'string');
=======
      if (Array.isArray(membersAny)) {
        return (membersAny as Array<GuildMember | string>)
          .map((m) => (typeof m === 'string' ? m : (m as GuildMember)?.user?.id))
          .filter((id): id is string => typeof id === 'string');
>>>>>>> origin/main:packages/adapter-discord/src/DiscordMessage.ts
      }

      // Plain object map for test mocks
      if (typeof membersAny === 'object' && membersAny !== null) {
        // Handle object with map function (test mocks)
        const mockCollection = membersAny as {
          map?: (fn: (member: GuildMember) => string | undefined) => string[];
        };
        if (typeof mockCollection.map === 'function') {
          const mapped = mockCollection.map((m: GuildMember) => m?.user?.id);
          return (Array.isArray(mapped) ? mapped : []).filter(
            (id): id is string => typeof id === 'string'
          );
        }

        // Handle plain object
        return Object.values(membersAny as Record<string, GuildMember | string>)
          .map((m) => (typeof m === 'string' ? m : (m as GuildMember)?.user?.id))
          .filter((id): id is string => typeof id === 'string');
      }

      return [];
    } catch (error: unknown) {
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
    const isBot = this.message.author?.bot || false;
    // ASCII-ify author name for clean terminal output (strip emojis/non-ASCII)
    const cleanName = (this.message.author?.username || 'unknown')
      .replace(/[^\x20-\x7E]/g, '')
      .substring(0, 20);
    debug(`isFromBot: ${cleanName} → ${isBot}`);
    return isBot;
  }

  /**
   * Checks whether this message is a reply (to any message).
   * Useful for generic reply-aware logic across providers.
   */
  isReply(): boolean {
    try {
      return Boolean(this.message?.reference?.messageId);
    } catch {
      return false;
    }
  }

  /**
   * Checks if this message is mentioning a specific user ID.
   * This is a convenience wrapper used by some helper modules.
   */
  isMentioning(userId: string): boolean {
    try {
      return this.mentionsUsers(userId);
    } catch {
      return false;
    }
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
   * Checks if this message was sent in a direct message (DM) context.
   *
   * @returns {boolean} True if the message is a DM
   */
  isDirectMessage(): boolean {
    try {
      // In Discord.js v13/v14, ChannelType.DM is 1.
      // We can also check if guild is null/undefined.
      if (!this.message.guildId && !this.message.guild) {
        return true;
      }
      // Or check typestring if available (older djs) or type enum
      const type = (this.message.channel as any).type;
      // 1 is DM, 3 is GroupDM.
      return type === 1 || type === 3 || type === 'DM';
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the Discord message being referenced (e.g., in replies).
   *
   * @returns {Promise<IMessage | null>} The referenced message as an IMessage, or null if none exists
   */
  public async getReferencedMessage(): Promise<IMessage | null> {
    if (this.message.reference && this.message.reference.messageId) {
      try {
        const referencedMsg = await this.message.channel.messages.fetch(
          this.message.reference.messageId
        );
        return new DiscordMessage(referencedMsg);
      } catch (error: unknown) {
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
