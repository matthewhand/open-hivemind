import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Message, TextChannel } from 'discord.js';

const debug = Debug('app:DiscordMessage');

/**
 * Represents a Discord message, implementing the IMessage interface.
 */
export default class DiscordMessage implements IMessage {
    public content: string;
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
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.content = message.content;
        this.channelId = message.channelId;
        this.data = message.content;
        this.role = '';  // Set to appropriate value based on your application's needs
        debug('[DiscordMessage] Initializing with message ID: ' + message.id);
    }

    /**
     * Gets the ID of the message.
     * @returns {string} - The message ID.
     */
    getMessageId(): string {
        debug('Getting message ID: ' + this.message.id);
        return this.message.id;
    }

    /**
     * Gets the text content of the message.
     * @returns {string} - The message content.
     */
    getText(): string {
        debug('Getting message text: ' + this.message.content);
        return this.message.content;
    }

    /**
     * Gets the ID of the channel where the message was sent.
     * @returns {string} - The channel ID.
     */
    getChannelId(): string {
        debug('Getting channel ID: ' + this.message.channelId);
        return this.message.channelId;
    }

    /**
     * Gets the topic of the channel where the message was sent.
     * @returns {string} - The channel topic.
     */
    getChannelTopic(): string {
        debug('Getting channel topic for channel: ' + this.message.channelId);
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
        debug('Getting author ID: ' + this.message.author.id);
        return this.message.author.id;
    }

    /**
     * Retrieves the user mentions in the message.
     * @returns {string[]} An array of user IDs mentioned in the message.
     */
    getUserMentions(): string[] {
        debug('Getting user mentions from message: ' + this.message.id);
        return this.message.mentions.users.map(user => user.id);
    }

    /**
     * Retrieves the users in the channel where the message was sent.
     * @returns {string[]} An array of user IDs in the channel.
     */
    getChannelUsers(): string[] {
        debug('Fetching users from channel: ' + this.message.channelId);
        if (this.message.channel instanceof TextChannel) {
            const members = this.message.channel.members;
            if (!members) {
                debug('No members found in channel: ' + this.message.channelId);
                return [];
            }
            return Array.from(members.values()).map(member => member.user.id);
        }
        return [];
    }

    /**
     * Gets the name of the author of the message.
     * If the author or username is not present, it defaults to 'Unknown Author'.
     * @returns {string} - The author's name.
     */
    public getAuthorName(): string {
        const author = this.message.author;
        if (author && author.username) {
            debug('Author name found: ' + author.username);
            return author.username;
        }
        debug('Author not found for message: ' + this.message.id);
        return 'Unknown Author';
    }

    /**
     * Checks if the message is from a bot.
     * @returns {boolean} True if the message is from a bot, false otherwise.
     */
    isFromBot(): boolean {
        debug('Checking if message is from a bot');
        return this.message.author.bot;
    }

    /**
     * Checks if the message is a reply to the bot.
     * @returns {boolean} - True if the message is a reply to the bot.
     */
    isReplyToBot(): boolean {
        debug('Checking if message is a reply to the bot');
        return !!this.repliedMessage && this.repliedMessage.author.bot;
    }

    /**
     * Checks if the message mentions a specific user.
     * @param {string} userId - The ID of the user to check for mentions.
     * @returns {boolean} True if the user is mentioned, false otherwise.
     */
    mentionsUsers(userId: string): boolean {
        debug('Checking if message mentions user: ' + userId);
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
