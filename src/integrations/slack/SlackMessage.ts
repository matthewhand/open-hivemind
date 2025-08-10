import { IMessage } from '@message/interfaces/IMessage';

/**
 * Slack-specific implementation of the IMessage interface with minimal real parsing.
 *
 * This normalizes common Slack message fields so downstream logic has reliable data:
 * - authorId from data.user or data.user_id
 * - messageId from data.ts
 * - isFromBot from data.subtype === 'bot_message' or data.bot_id presence
 * - mentions parsed from <@UXXXX> tokens in text
 * - timestamp from data.ts (seconds.fraction) to Date
 */
export default class SlackMessage extends IMessage {
  public content: string;
  public channelId: string;
  public data: any;
  public role: string;

  private authorId: string;
  private authorName: string | undefined;
  private messageId: string | undefined;
  private isBot: boolean;
  private mentions: string[];
  private timestamp: Date;

  constructor(content: string, channelId: string, data: any = {}) {
    super(data, 'user');
    this.content = content ?? '';
    this.channelId = channelId ?? '';
    this.data = data || {};
    this.role = 'user';

    this.authorId = this.resolveAuthorId(this.data);
    this.authorName = this.resolveAuthorName(this.data);
    this.messageId = this.resolveMessageId(this.data);
    this.isBot = this.resolveIsBot(this.data);
    this.mentions = this.extractMentions(this.content);
    this.timestamp = this.resolveTimestamp(this.data) ?? new Date(0);
  }

  getText(): string {
    return this.content;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getAuthorId(): string {
    return this.authorId || 'unknown';
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  public setText(text: string): void {
    this.content = text ?? '';
    // Re-extract mentions when text changes
    this.mentions = this.extractMentions(this.content);
  }

  getUserMentions(): string[] {
    return [...this.mentions];
  }

  getChannelUsers(): string[] {
    // Not available without additional API calls; return empty list to satisfy interface.
    return [];
  }

  getAuthorName(): string {
    return this.authorName || 'Unknown User';
  }

  isFromBot(): boolean {
    return this.isBot;
  }

  isReplyToBot(): boolean {
    // Minimal heuristic: check if this is part of a thread replying to a bot ts stored in data.thread_ts with bot marker in parent (not available).
    // Without parent fetch, return false by default.
    return false;
  }

  getMessageId(): string {
    return this.messageId || 'unknown';
  }

  getChannelTopic(): string | null {
    // Not available on the event payload; requires conversations.info call.
    return null;
  }

  mentionsUsers(userId: string): boolean {
    if (!userId) return false;
    return this.mentions.includes(userId);
  }

  // Helpers

  private resolveAuthorId(data: any): string {
    // event.user or payload.user.id or message.user
    return data?.user?.id || data?.user || data?.message?.user || data?.user_id || '';
  }

  private resolveAuthorName(data: any): string | undefined {
    // payload.user.username or user.name from richer events
    return data?.user?.username || data?.user?.name || data?.username;
  }

  private resolveMessageId(data: any): string | undefined {
    // Slack ts (e.g., "1712345678.000200")
    return data?.ts || data?.message_ts || data?.event_ts || data?.message?.ts;
  }

  private resolveIsBot(data: any): boolean {
    // subtype bot_message, presence of bot_id, or explicit flag
    if (data?.subtype === 'bot_message') return true;
    if (data?.bot_id) return true;
    if (data?.message?.subtype === 'bot_message') return true;
    return false;
  }

  private extractMentions(text: string): string[] {
    if (!text) return [];
    // Matches <@U123ABC456> or <@W123...> (Workspace apps may use W-prefixed IDs)
    const regex = /<@([UW][A-Z0-9]+)>/g;
    const ids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      ids.add(m[1]);
    }
    return Array.from(ids);
  }

  private resolveTimestamp(data: any): Date | undefined {
    const ts = data?.ts || data?.message_ts || data?.event_ts || data?.message?.ts;
    if (!ts || typeof ts !== 'string') return;
    // Slack ts "seconds.millis"
    const [secStr, fracStr] = ts.split('.');
    const sec = Number(secStr);
    const ms = Number((fracStr || '0').padEnd(3, '0').slice(0, 3));
    if (!Number.isFinite(sec) || !Number.isFinite(ms)) return;
    return new Date(sec * 1000 + ms);
  }
}
