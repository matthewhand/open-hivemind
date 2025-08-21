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

export class MattermostMessage {
  private post: MattermostPost;
  private username: string;

  constructor(post: MattermostPost, username: string = 'Unknown') {
    this.post = post;
    this.username = username;
  }

  public toIMessage(): IMessage {
    return {
      id: this.post.id,
      content: this.post.message,
      channelId: this.post.channel_id,
      userId: this.post.user_id,
      userName: this.username,
      timestamp: new Date(this.post.create_at),
      platform: 'mattermost',
      metadata: {
        edited: this.post.edit_at > 0,
        editedAt: this.post.edit_at > 0 ? new Date(this.post.edit_at) : undefined,
        isPinned: this.post.is_pinned,
        type: this.post.type,
        replyCount: this.post.reply_count,
        hashtags: this.post.hashtags ? this.post.hashtags.split(' ') : [],
        props: this.post.props
      }
    };
  }

  public getId(): string {
    return this.post.id;
  }

  public getContent(): string {
    return this.post.message;
  }

  public getChannelId(): string {
    return this.post.channel_id;
  }

  public getUserId(): string {
    return this.post.user_id;
  }

  public getUsername(): string {
    return this.username;
  }

  public isEdited(): boolean {
    return this.post.edit_at > 0;
  }

  public isPinned(): boolean {
    return this.post.is_pinned;
  }

  public getReplyCount(): number {
    return this.post.reply_count;
  }
}