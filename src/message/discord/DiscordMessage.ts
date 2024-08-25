import { GuildMember, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import ConfigurationManager from '@config/ConfigurationManager';

/**
 * Represents a Discord message, extending a generic message interface.
 * This class encapsulates the properties and behaviors of a Discord message,
 * providing methods to access its content, channel ID, author ID, and more,
 * with added error handling and logging for robustness.
 */
export default class DiscordMessage {
    private message: Message;
    private repliedMessage: Message | null;
    private isBotExplicitlySet: boolean | null;
    public id: string;
    public content: string;
    public channelId: string;
    public authorId: string;
    public isBot: boolean;

    /**
     * Constructs an instance of DiscordMessage.
     * @param {Message} message - The raw message object from Discord.
     * @param {Message | null} [repliedMessage=null] - The message this message is replying to, if any.
     * @param {boolean | null} [isBot=null] - Indicates explicitly if the message is from a bot.
     */
    constructor(message: Message, repliedMessage: Message | null = null, isBot: boolean | null = null) {
        if (!message) {
            logger.error('DiscordMessage constructor: message parameter is undefined or null.');
            throw new Error('Message parameter is required');
        }

        logger.debug('[DiscordMessage] Initializing with message ID: ' + message.id);

        this.message = message;
        this.repliedMessage = repliedMessage;
        this.isBotExplicitlySet = isBot;

        if (!this.message.content) {
            logger.error('[DiscordMessage]: message content is undefined or null.');
            throw new Error('Message content is required');
        }

        this.id = message.id;
        this.content = message.content;
        this.channelId = message.channel.id;
        this.authorId = message.author ? message.author.id : 'unknown';
        this.isBot = (isBot !== null) ? isBot : !!message.author.bot;

    }

    /**
     * Retrieves the ID of the message.
     * @returns {string} The message ID.
     */
    getMessageId(): string {
        return this.message.id;
    }

    /**
     * Retrieves the content of the message.
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
     * @returns {Array<{ id: string, displayName: string }>} An array of user mentions.
     */
    getUserMentions(): Array<{ id: string, displayName: string }> {
        return this.message.mentions.users.map(user => ({
            id: user.id,
            displayName: user.username,
        }));
    }

    /**
     * Retrieves the users in the channel where the message was sent.
     * @returns {Array<{ id: string, displayName: string }>} An array of users in the channel.
     */
    getChannelUsers(): Array<{ id: string, displayName: string }> {
        if (this.message.channel instanceof TextChannel) {
            const members = this.message.channel.members as Map<string, GuildMember>;
            return Array.from(members.values()).map(member => ({
                id: member.user.id,
                displayName: member.user.username,
            }));
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
}
