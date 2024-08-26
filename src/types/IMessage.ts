import Debug from "debug";
export interface IMessage {
    id: string;
    content: string;
    channelId: string;
    authorId: string;
    timestamp: number;
    client: any;
    role: string;
    isFromBot: boolean;

    getText(): string;
    getUserMentions(): string[];
    getChannelUsers(): string[];
    getChannelTopic(): string;
    getAuthorId(): string;
    getMessageId(): string;
}
