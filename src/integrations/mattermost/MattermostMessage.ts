import { IMessage } from '@message/interfaces/IMessage';

export class MattermostMessage extends IMessage {
  private _text: string;
  private _post: any;
  private _username: string;
  private _isBot: boolean;

  constructor(
    post: any,
    username: string,
    context: { isBot: boolean; botUsername?: string; botUserId?: string }
  ) {
    super(post, 'user', { isMention: false });
    this._post = post;
    this._text = post.message || '';
    this._username = username;
    this._isBot = context.isBot;
    this.platform = 'mattermost';
    this.content = this._text;
    this.channelId = post.channel_id;

    // Basic mention detection
    if (context.botUsername && this._text.includes(`@${context.botUsername}`)) {
      if (this.metadata) {
        this.metadata.isMention = true;
      }
    }
  }

  public getMessageId(): string {
    return this._post.id;
  }

  public getText(): string {
    return this._text;
  }

  public getTimestamp(): Date {
    return new Date(this._post.create_at);
  }

  public setText(text: string): void {
    this._text = text;
    this.content = text;
  }

  public getChannelId(): string {
    return this.channelId;
  }

  public getAuthorId(): string {
    return this._post.user_id;
  }

  public getChannelTopic(): string | null {
    return null; // Mattermost channels might have headers/purposes, but the basic post doesn't include it.
  }

  public getUserMentions(): string[] {
    // Basic extraction of @mentions
    const mentions = this._text.match(/@[\w.-]+/g);
    return mentions ? mentions.map(m => m.substring(1)) : [];
  }

  public getChannelUsers(): string[] {
    return []; // Would require an API call to get all users in a channel
  }

  public mentionsUsers(userId: string): boolean {
    return this.getUserMentions().includes(userId);
  }

  public isFromBot(): boolean {
    return this._isBot;
  }

  public getAuthorName(): string {
    return this._username;
  }
}
