import { IMessage } from '@message/types/IMessage';

class DiscordMessageImpl implements IMessage {
    constructor(private msg: any) {
        super(msg, 'user');
    }

    getMessageId(): string {
        return this.msg.id;
    }

    getText(): string {
        return this.msg.content;
    }

    getChannelId(): string {
        return this.msg.channelId;
    }

    getAuthorId(): string {
        return this.msg.author.id;
    }

    getChannelTopic(): string | null {
        return this.msg.channel.topic || null;
    }

    getUserMentions(): string[] {
        return this.msg.mentions.users.map((user: any) => user.id);
    }

    getChannelUsers(): string[] {
        return this.msg.guild ? this.msg.guild.members.cache.map((member: any) => member.id) : [];
    }

    mentionsUsers(userId: string): boolean {
        return this.msg.mentions.users.has(userId);
    }

    isFromBot(): boolean {
        return this.msg.author.bot;
    }
}

export default DiscordMessageImpl;
