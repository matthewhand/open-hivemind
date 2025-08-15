import { IMessage } from '@message/interfaces/IMessage';

/**
 * Mattermost-specific implementation of IMessage.
 *
 * Normalizes common Mattermost post fields so downstream logic has reliable data:
 * - authorId from data.user_id
 * - messageId from data.id
 * - isFromBot via data.props?.from_webhook or data.props?.bot_user_id or explicit flag
 * - channelId from data.channel_id
 * - timestamp from data.create_at (ms) to Date
 * - mentions: best-effort parse of @username tokens (returns strings; user ID mapping not available here)
 */
export default class MattermostMessage extends IMessage {
  public content: string;
  public channelId: string;
  public data: any;
  public role: string;

  private authorId: string;
  private authorName: string | undefined;
  private messageId: string | undefined;
  private isBot: boolean;
  private timestamp: Date;
  private mentions: string[];

  constructor(post: any) {
    super(post, 'user');
    this.data = post || {};
    this.content = String(post?.message ?? '');
    this.channelId = String(post?.channel_id ?? '');
    this.role = 'user';

    this.authorId = String(post?.user_id ?? '');
    this.authorName = post?.props?.username || post?.metadata?.sender_name;
    this.messageId = String(post?.id ?? '');
    this.isBot = Boolean(
      post?.props?.from_webhook ||
      post?.props?.bot_user_id ||
      post?.props?.override_username ||
      post?.type === 'system_generic'
    );
    this.timestamp = this.resolveTimestamp(post);
    this.mentions = this.extractMentions(this.content);
  }

  getMessageId(): string { return this.messageId || 'unknown'; }
  getText(): string { return this.content; }
  getTimestamp(): Date { return this.timestamp; }
  public setText(text: string): void {
    this.content = text ?? '';
    this.mentions = this.extractMentions(this.content);
  }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return this.authorId || 'unknown'; }
  getAuthorName(): string { return this.authorName || 'Unknown User'; }
  getChannelTopic(): string | null { return null; }
  isFromBot(): boolean { return this.isBot; }
  mentionsUsers(userId: string): boolean { return this.mentions.includes(userId); }
  getUserMentions(): string[] { return [...this.mentions]; }
  getChannelUsers(): string[] { return []; }

  private resolveTimestamp(post: any): Date {
    const ms = Number(post?.create_at);
    if (Number.isFinite(ms)) return new Date(ms);
    return new Date(0);
  }

  private extractMentions(text: string): string[] {
    if (!text) return [];
    // Rough parse of @username mentions (Mattermost uses @handles)
    const regex = /@([a-zA-Z0-9._-]+)/g;
    const ids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      ids.add(m[1]);
    }
    return Array.from(ids);
  }
}

