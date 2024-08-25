import { IMessage } from '@src/message/interfaces/IMessage';
import { Message, TextChannel, Client } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:message:discord');

/**
 * Represents a Discord message, implementing the IMessage interface.
 * This class encapsulates the properties and behaviors of a Discord message,
 * providing methods to access its content, channel ID, author ID, and more,
 * with added error handling and logging for robustness.
 */
export default class DiscordMessage extends IMessage {
    public message: Message;
    public repliedMessage: Message | null;
    public isBotExplicitlySet: boolean | null;
    public client: Client;

    /**
     * Constructs an instance of DiscordMessage.
     * @param {Message} message - The raw message object from Discord.
     * @param {Message | null} [repliedMessage=null] - The message this message is replying to, if any.
     * @param {boolean | null} [isBot=null] - Indicates explicitly if the message is from a bot.
     */
    constructor(message: Message, role: string, repliedMessage: Message | null = null, isBot: boolean | null = null) {
        super(message, role);
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.isBotExplicitlySet = isBot;
        this.client = message.client;
        debug('[DiscordMessage] Initializing with message ID: ' + message.id);
    }

    /**
     * Retrieves the ID of the message.
     * @returns {string} The message ID.
     */
    getMessageId(): string {
        return this.message.id;
    }

    /**
     * Retrieves the text content of the message.
     * @returns {string} The text content of the message.
     */
    getText(): string {
        return this.message.content;
    }

    /**
     * Retrieves the channel ID where the message was sent.
     * @returns {string} The channel ID.
     */
    getChannelId(): string {
        return this.message.channel.id;
    }

    /**
     * Retrieves the author ID of the message.
     * @returns {string} The author ID.
     */
    getAuthorId(): string {
        return this.message.author.id;
    }

    /**
     * Retrieves the topic of the channel where the message was sent.
     * @returns {string} The channel topic or 'No topic' if none is set.
     */
    getChannelTopic(): string {
        if (this.message.channel instanceof TextChannel) {
            return this.message.channel.topic || 'No topic';
        }
        return 'No topic';
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
     * @returns {boolean} True if the message is a reply to the bot, false otherwise.
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
}
