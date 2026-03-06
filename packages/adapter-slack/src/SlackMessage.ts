import { IMessage } from '@message/interfaces/IMessage';
import { InputSanitizer, sanitizeMessageText } from '@common/security/inputSanitizer';

// Define proper Slack message interfaces
interface SlackUser {
  id: string;
  username?: string;
  name?: string;
}

interface SlackMessageData {
  user?: string | SlackUser;
  user_id?: string;
  message?: {
    user?: string;
    ts?: string;
    subtype?: string;
  };
  username?: string;
  ts?: string;
  message_ts?: string;
  event_ts?: string;
  subtype?: string;
  bot_id?: string;
  thread_ts?: string;
  [key: string]: unknown;
}

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
  public data: SlackMessageData;
  public role: string;

  private authorId: string;
  private authorName: string | undefined;
  private messageId: string | undefined;
  private isBot: boolean;
  private mentions: string[];
  private timestamp: Date;

  constructor(content: string, channelId: string, data: SlackMessageData = {}) {
    super(data, 'user');
    // Sanitize user-provided content
    this.content = sanitizeMessageText(content ?? '');
    this.channelId = InputSanitizer.sanitizeChannelId(channelId ?? '');
    this.data = this.sanitizeMessageData(data || {});
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
    this.content = sanitizeMessageText(text ?? '');
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
    if (!userId) {
      return false;
    }
    return this.mentions.includes(userId);
  }

  // Helpers

  private resolveAuthorId(data: SlackMessageData): string {
    // event.user or payload.user.id or message.user
    if (data?.user && typeof data.user === 'object' && 'id' in data.user) {
      return data.user.id;
    }
    return (
      (typeof data?.user === 'string' ? data.user : '') ||
      data?.message?.user ||
      data?.user_id ||
      ''
    );
  }

  private resolveAuthorName(data: SlackMessageData): string | undefined {
    // payload.user.username or user.name from richer events
    if (data?.user && typeof data.user === 'object') {
      const rawName = data.user.username || data.user.name;
      return rawName ? InputSanitizer.sanitizeName(rawName) : undefined;
    }
    return data?.username ? InputSanitizer.sanitizeName(data.username) : undefined;
  }

  private resolveMessageId(data: SlackMessageData): string | undefined {
    // Slack ts (e.g., "1712345678.000200")
    return data?.ts || data?.message_ts || data?.event_ts || data?.message?.ts;
  }

  private resolveIsBot(data: SlackMessageData): boolean {
    // subtype bot_message, presence of bot_id, or explicit flag
    if (data?.subtype === 'bot_message') {
      return true;
    }
    if (data?.bot_id) {
      return true;
    }
    if (data?.message?.subtype === 'bot_message') {
      return true;
    }
    return false;
  }

  private extractMentions(text: string): string[] {
    if (!text) {
      return [];
    }
    // Matches <@U123ABC456> or <@W123...> (Workspace apps may use W-prefixed IDs)
    // Also handles HTML-encoded versions (&lt;@...&gt;) after sanitization
    const regex = /(?:<@|&lt;@)([UW][A-Z0-9]+)(?:>|&gt;)/g;
    const ids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      ids.add(m[1]);
    }
    return Array.from(ids);
  }

  private resolveTimestamp(data: SlackMessageData): Date | undefined {
    const ts = data?.ts || data?.message_ts || data?.event_ts || data?.message?.ts;
    if (!ts || typeof ts !== 'string') {
      return undefined;
    }
    // Slack ts "seconds.millis"
    const [secStr, fracStr] = ts.split('.');
    const sec = Number(secStr);
    const ms = Number((fracStr || '0').padEnd(3, '0').slice(0, 3));
    if (!Number.isFinite(sec) || !Number.isFinite(ms)) {
      return undefined;
    }
    return new Date(sec * 1000 + ms);
  }

  /**
   * Sanitizes message data to prevent security issues
   * @param data - Raw message data from Slack
   * @returns Sanitized message data
   */
  private sanitizeMessageData(data: any): any {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const sanitized = { ...data };

    // Sanitize user-provided text fields
    if (sanitized.text) {
      sanitized.text = sanitizeMessageText(sanitized.text);
    }

    // Sanitize user profile information
    if (sanitized.user_profile) {
      if (sanitized.user_profile.real_name) {
        sanitized.user_profile.real_name = InputSanitizer.sanitizeName(
          sanitized.user_profile.real_name
        );
      }
      if (sanitized.user_profile.display_name) {
        sanitized.user_profile.display_name = InputSanitizer.sanitizeName(
          sanitized.user_profile.display_name
        );
      }
      if (sanitized.user_profile.email) {
        sanitized.user_profile.email = InputSanitizer.sanitizeEmail(sanitized.user_profile.email);
      }
    }

    // Sanitize file attachments
    if (sanitized.files && Array.isArray(sanitized.files)) {
      sanitized.files = sanitized.files.map((file: any) => ({
        ...file,
        name: InputSanitizer.sanitizeFileName(file.name),
        title: file.title
          ? InputSanitizer.sanitizeText(file.title, { maxLength: 200 })
          : file.title,
      }));
    }

    // Sanitize reaction names
    if (sanitized.reactions && Array.isArray(sanitized.reactions)) {
      sanitized.reactions = sanitized.reactions.map((reaction: any) => ({
        ...reaction,
        name: reaction.name
          ? InputSanitizer.sanitizeText(reaction.name, { maxLength: 50, allowMarkdown: false })
          : reaction.name,
      }));
    }

    // Sanitize user IDs
    if (sanitized.user) {
      if (typeof sanitized.user === 'string') {
        // Handle string user ID
        sanitized.user = InputSanitizer.sanitizeUserId(sanitized.user);
      } else if (sanitized.user && typeof sanitized.user === 'object') {
        // Handle user object with nested fields
        if (sanitized.user.id) {
          sanitized.user.id = InputSanitizer.sanitizeUserId(sanitized.user.id);
        }
        if (sanitized.user.name) {
          sanitized.user.name = InputSanitizer.sanitizeName(sanitized.user.name);
        }
        if (sanitized.user.username) {
          sanitized.user.username = InputSanitizer.sanitizeName(sanitized.user.username);
        }
      }
    }
    if (sanitized.user_id) {
      sanitized.user_id = InputSanitizer.sanitizeUserId(sanitized.user_id);
    }

    return sanitized;
  }
}
