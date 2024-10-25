/**
 * DiscordMessage.ts
 *
 * This class encapsulates the Discord message object, providing utility methods to access message properties
 * such as text, author ID, channel ID, and mentions. It ensures safe access to properties and includes
 * comprehensive debug statements for better traceability.
 */

import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Message, TextChannel } from 'discord.js';

const debug = Debug('app:DiscordMessage');

/**
 * DiscordMessage class wraps the Discord.js Message object to provide additional utility methods.
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

    public setText(text: string): void {
        debug('Setting message text: ' + text);
        this.content = text;
    }

    getChannelId(): string {
        debug('Getting channel ID: ' + this.channelId);
        return this.channelId;
    }

    getChannelTopic(): string {
        debug('Getting channel topic for channel: ' + this.channelId);
        if (this.message.channel instanceof TextChannel) {
            return this.message.channel.topic || '';
        }
        return '';
    }

    getAuthorId(): string {
        debug('Getting author ID: ' + this.message.author.id);
        return this.message.author.id;
    }

    getUserMentions(): string[] {
        debug('Getting user mentions from message: ' + this.message.id);
        return this.message.mentions.users.map((user) => user.id);
    }

    getChannelUsers(): string[] {
        debug('Fetching users from channel: ' + this.channelId);
        if (this.message.channel instanceof TextChannel) {
            const members = this.message.channel.members;
            return Array.from(members.values()).map((member) => member.user.id);
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
        return this.message.mentions.users.has(userId);
    }

    getOriginalMessage(): Message {
        return this.message;
    }
}
