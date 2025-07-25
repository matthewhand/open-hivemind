import { IMessage } from '@message/interfaces/IMessage';

export class SyntheticMessage implements IMessage {
  public content: string = "";
  public channelId: string = "";
  public data: any;
  public role: string = "system";
  public metadata?: any;
  public tool_call_id?: string;
  public tool_calls?: any[];

  private messageId: string;
  private text: string;
  private authorId: string;
  private originalChannelId: string;
  private authorName: string;
  private channelTopic: string | null;
  private userMentions: string[];
  private channelUsers: string[];
  private timestamp: Date;

  constructor(originalMessage: IMessage, syntheticText: string) {
    this.originalChannelId = originalMessage.getChannelId();
    this.content = syntheticText;
    this.data = originalMessage.data;
    this.metadata = originalMessage.metadata;
    this.messageId = `synthetic-${this.originalChannelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.text = syntheticText;
    this.authorId = 'idle_response_system';
    this.authorName = 'System';
    this.channelTopic = originalMessage.getChannelTopic();
    this.userMentions = [];
    this.channelUsers = originalMessage.getChannelUsers();
    this.timestamp = new Date();
  }

  getMessageId(): string {
    return this.messageId;
  }

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    this.text = text;
    this.content = text;
  }

  getChannelId(): string {
    return this.originalChannelId;
  }

  getAuthorId(): string {
    return this.authorId;
  }

  getChannelTopic(): string | null {
    return this.channelTopic;
  }

  getUserMentions(): string[] {
    return this.userMentions;
  }

  getChannelUsers(): string[] {
    return this.channelUsers;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  isReplyToBot(): boolean {
    return false;
  }

  mentionsUsers(userId: string): boolean {
    return false;
  }

  isFromBot(): boolean {
    return true;
  }

  getAuthorName(): string {
    return this.authorName;
  }
}