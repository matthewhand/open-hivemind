import { IMessage } from '@src/message/interfaces/IMessage';
import { Message, TextChannel } from 'discord.js';
import Debug from 'debug';
const debug = Debug('app:message:discord');
/**
 * Represents a Discord message, implementing the IMessage interface.
 */
export default class DiscordMessage extends IMessage {
  public content: string;
  public client: Message['client'];
  public channelId: string;
  public data: string;
  public role: string;
  private readonly message: Message;
  private readonly repliedMessage: Message | null;
  /**
   * Constructs an instance of DiscordMessage.
   * @param {Message} message - The raw message object from Discord.
   * @param {Message | null} [repliedMessage=null] - The message this message is replying to, if any.
   */
  constructor(message: Message, repliedMessage: Message | null = null) {
    super(message, '');
    this.message = message;
    this.repliedMessage = repliedMessage;
    this.content = message.content;
    this.client = message.client;
    this.channelId = message.channelId;
    this.data = message.content;
    this.role = '';  // Set this to the appropriate value based on your application's needs
    debug('[DiscordMessage] Initializing with message ID: ' + message.id);
  }
  /**
   * Gets the ID of the message.
   * @returns {string} - The message ID.
   */
  getMessageId(): string {
    return this.message.id;
  }
  /**
   * Gets the text content of the message.
   * @returns {string} - The message content.
   */
  getText(): string {
    return this.message.content;
  }
  /**
   * Gets the ID of the channel where the message was sent.
   * @returns {string} - The channel ID.
   */
  getChannelId(): string {
    return this.message.channelId;
  }
  /**
   * Gets the topic of the channel where the message was sent.
   * @returns {string} - The channel topic.
   */
  getChannelTopic(): string {
    if (this.message.channel instanceof TextChannel) {
      return this.message.channel.topic || '';
    }
    return '';
  }
  /**
   * Gets the ID of the author of the message.
   * @returns {string} - The author's ID.
   */
  getAuthorId(): string {
    return this.message.author.id;
  }
  /**
   * Retrieves the user mentions in the message.
   * @returns {string[]} An array of user IDs mentioned in the message.
   */
  getUserMentions(): string[] {
    return this.message.mentions.users.map(user => user.id);
  }
  /**
   * Retrieves the users in the channel where the message was sent.
   * @returns {string[]} An array of user IDs in the channel.
   */
  getChannelUsers(): string[] {
    if (this.message.channel instanceof TextChannel) {
      const members = this.message.channel.members;
      return Array.from(members.values()).map(member => member.user.id);
    }
    return [];
  }
  /**
   * Checks if the message is from a bot.
   * @returns {boolean} True if the message is from a bot, false otherwise.
   */
  isFromBot(): boolean {
    return this.message.author.bot;
  }
  /**
   * Checks if the message is a reply to the bot.
   * @returns {boolean} - True if the message is a reply to the bot.
   */
  isReplyToBot(): boolean {
    return !!this.repliedMessage && this.repliedMessage.author.bot;
  }
  /**
   * Checks if the message mentions a specific user.
   * @param {string} userId - The ID of the user to check for mentions.
   * @returns {boolean} True if the user is mentioned, false otherwise.
   */
  mentionsUsers(userId: string): boolean {
    return this.message.mentions.users.has(userId);
  }
  /**
   * Gets the original `discord.js` Message object.
   * This method is specific to the Discord implementation and is not part of the `IMessage` interface.
   * @returns {Message} - The original `discord.js` Message object.
   */
  getOriginalMessage(): Message {
    return this.message;
  }
}
