// src/integrations/discord/DiscordMessage.ts
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { GuildMember, Message, TextChannel, User } from 'discord.js';

const debug = Debug('app:DiscordMessage');

/**
 * DiscordMessage class wraps the Discord.js Message object to provide additional utility methods.
 */
export default class DiscordMessage implements IMessage {
  public content: string;
  public channelId: string;
  public data: any;
  public role: string;
  private readonly message: Message<boolean>;
  private readonly repliedMessage: Message<boolean> | null;

  /**
   * Constructs an instance of DiscordMessage.
   * @param {Message<boolean>} message - The raw message object from Discord.
   * @param {Message<boolean> | null} [repliedMessage=null] - The message this message is replying to, if any.
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

  getMessageId(): string {
    const messageId = this.message.id || 'unknown';
    debug('Getting message ID: ' + messageId);
    return messageId;
  }

  getText(): string {
    debug('Getting message text: ' + this.content);
    return this.content;
  }


    /**
     * Retrieves the timestamp of the message.
     * @returns {Date} The message timestamp.
     */
    public getTimestamp(): Date {
        debug('Getting timestamp for message: ' + this.message.id);
        return this.message.createdAt;
    }

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

  getChannelId(): string {
    debug('Getting channel ID: ' + this.channelId);
    return this.channelId;
  }

  getChannelTopic(): string | null {
    debug('Getting channel topic for channel: ' + this.channelId);
    if (this.message.channel instanceof TextChannel) {
      return this.message.channel.topic || null;
    }
    return null;
  }

  getAuthorId(): string {
    debug('Getting author ID: ' + this.message.author.id);
    return this.message.author.id;
  }

  getUserMentions(): string[] {
    debug('Getting user mentions from message: ' + this.message.id);
    const users = this.message.mentions?.users;
    if (!users) {
      return [];
    }
  
    // A real Collection has a .map() method.
    if (typeof users.map === 'function') {
      return users.map(user => user.id);
    }
    
    // Fallback for mock objects that are just plain objects.
    const ids: string[] = [];
    for (const key in users) {
      if (Object.prototype.hasOwnProperty.call(users, key)) {
        const potentialUser = (users as any)[key] as User;
        if (potentialUser && typeof potentialUser.id === 'string') {
          ids.push(potentialUser.id);
        }
      }
    }
    return ids;
  }
  
  getChannelUsers(): string[] {
    debug('Fetching users from channel: ' + this.channelId);
    if (this.message.channel instanceof TextChannel) {
      const membersManager = this.message.channel.members;
      if (!membersManager) {
        return [];
      }
  
      // For real discord.js, the collection is in the `cache` property of the manager.
      // For mocks, the manager itself might be the collection.
      const collection = (membersManager as any).cache || membersManager;
      
      if (collection && typeof collection.map === 'function') {
        return collection.map((member: GuildMember) => member.user.id);
      }
      
      // Fallback for simple object mocks
      const ids: string[] = [];
      for (const key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          const potentialMember = (collection as any)[key] as GuildMember;
          if (potentialMember && potentialMember.user && typeof potentialMember.user.id === 'string') {
            ids.push(potentialMember.user.id);
          }
        }
      }
      return ids;
    }
    return [];
  }

  getAuthorName(): string {
    const authorName = this.message.author.username || 'Unknown Author';
    debug('Author name: ' + authorName);
    return authorName;
  }

  isFromBot(): boolean {
    debug('Checking if message is from a bot');
    return this.message.author?.bot || false;
  }

  isReplyToBot(): boolean {
    if (this.repliedMessage) {
      const isBot = this.repliedMessage.author?.bot || false;
      debug(`Is reply to bot: ${isBot}`);
      return isBot;
    }
    debug('No replied message found.');
    return false;
  }

  mentionsUsers(userId: string): boolean {
    debug('Checking if message mentions user: ' + userId);
    if (!this.message.mentions || !this.message.mentions.users) {
        return false;
    }
    return this.message.mentions.users.has(userId);
  }

  getOriginalMessage(): Message<boolean> {
    return this.message;
  }

  /**
   * Retrieves the message being referenced (e.g., in replies).
   * @returns {Promise<IMessage | null>} The referenced IMessage or null if none exists.
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
