import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { Message, TextChannel } from 'discord.js';

const debug = Debug('app:DiscordMessage');

export default class DiscordMessage implements IMessage {
    public content: string;
    public channelId: string;
    public data: string;
    public role: string;
    private readonly message: Message;
    private readonly repliedMessage: Message | null;

    constructor(message: Message, repliedMessage: Message | null = null) {
        this.message = message;
        this.repliedMessage = repliedMessage;
        this.content = message.content || '[No content]';  // Default if content is empty
        this.channelId = message.channelId;
        this.data = message.content;
        this.role = '';  // Customize based on your needs
        debug('[DiscordMessage] Initializing with message ID: ' + (message.id || 'undefined'));
    }

    getMessageId(): string {
        const messageId = this.message.id || 'unknown';
        debug('Getting message ID: ' + messageId);
        return messageId;
    }

    getText(): string {
        const text = this.content || '[No content]';  // Fallback to prevent undefined
        debug('Getting message text: ' + text);
        return text;
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
        return this.message.mentions.users.map(user => user.id);
    }

    getChannelUsers(): string[] {
        debug('Fetching users from channel: ' + this.channelId);
        if (this.message.channel instanceof TextChannel) {
            const members = this.message.channel.members;
            return Array.from(members.values()).map(member => member.user.id);
        }
        return [];
    }

    getAuthorName(): string {
        const authorName = this.message.author?.username || 'Unknown Author';
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
