import { IMessage } from '@message/interfaces/IMessage';

export interface MattermostPost {
  id: string;
  message: string;
  channel_id: string;
  user_id: string;
  create_at: number;
  update_at: number;
  edit_at: number;
  delete_at: number;
  is_pinned: boolean;
  type: string;
  props: any;
  hashtags: string;
  pending_post_id: string;
  reply_count: number;
  metadata: any;
}

export class MattermostMessage extends IMessage {
  private post: MattermostPost;
  private username: string;
  private isBot: boolean;
  private mentions: string[];
  private botUsername?: string;
  private botUserId?: string;

  constructor(
    post: MattermostPost,
    username = 'Unknown',
    options?: { isBot?: boolean; botUsername?: string; botUserId?: string }
  ) {
    super(post, 'user', {
      edited: post.edit_at > 0,
      editedAt: post.edit_at > 0 ? new Date(post.edit_at) : undefined,
      isPinned: post.is_pinned,
      type: post.type,
      replyCount: post.reply_count,
      hashtags: post.hashtags ? post.hashtags.split(' ') : [],
      props: post.props,
    });
    this.post = post;
    this.username = username;
    this.content = post.message;
    this.channelId = post.channel_id;
    this.platform = 'mattermost';
    this.isBot = Boolean(options?.isBot);
    this.botUsername = options?.botUsername;
    this.botUserId = options?.botUserId;
    this.mentions = this.extractMentions(this.content);
  }

  public getMessageId(): string {
    return this.post.id;
  }

  public getTimestamp(): Date {
    return new Date(this.post.create_at);
  }

  public setText(text: string): void {
    this.content = text;
  }

  public getChannelId(): string {
    return this.post.channel_id;
  }

  public getAuthorId(): string {
    return this.post.user_id;
  }

  public getChannelTopic(): string | null {
    return null;
  }

  public getUserMentions(): string[] {
    return [...this.mentions];
  }

  public getChannelUsers(): string[] {
    return [];
  }

  public mentionsUsers(userId: string): boolean {
    if (!userId) {
      return false;
    }
    if (this.mentions.includes(userId)) {
      return true;
    }
    if (this.botUserId && userId === this.botUserId && this.botUsername) {
      return this.mentions.includes(this.botUsername);
    }
    return false;
  }

  public isFromBot(): boolean {
    return this.isBot;
  }

  public getAuthorName(): string {
    return this.username;
  }

  private extractMentions(text: string): string[] {
    if (!text) {
      return [];
    }
    const regex = /@([a-z0-9._-]+)/gi;
    const matches = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) {
        matches.add(m[1]);
      }
    }
    return Array.from(matches);
  }
}
