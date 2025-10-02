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

  constructor(post: MattermostPost, username: string = 'Unknown') {
    super(post, 'user', {
      edited: post.edit_at > 0,
      editedAt: post.edit_at > 0 ? new Date(post.edit_at) : undefined,
      isPinned: post.is_pinned,
      type: post.type,
      replyCount: post.reply_count,
      hashtags: post.hashtags ? post.hashtags.split(' ') : [],
      props: post.props
    });
    this.post = post;
    this.username = username;
    this.content = post.message;
    this.channelId = post.channel_id;
    this.platform = 'mattermost';
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
    return [];
  }

  public getChannelUsers(): string[] {
    return [];
  }

  public mentionsUsers(): boolean {
    return false;
  }

  public isFromBot(): boolean {
    return false;
  }

  public getAuthorName(): string {
    return this.username;
  }

}