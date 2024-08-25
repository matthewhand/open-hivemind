export interface IMessage {
    data: any;
    role: string;
    getMessageId(): string;
    getText(): string;
    content: string;
    client: any;
    channelId: string;
}
