import { IMessage } from '@hivemind/shared-types';

/** Minimal Telegram Bot API `User` object. */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

/** Minimal Telegram Bot API `Chat` object. */
export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel' | (string & {});
  title?: string;
  username?: string;
}

/** Minimal Telegram Bot API `MessageEntity` object. */
export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  user?: TelegramUser;
}

/** Minimal Telegram Bot API `Message` object (the payload of an update). */
export interface TelegramApiMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  /** Unix timestamp, in seconds. */
  date: number;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  reply_to_message?: TelegramApiMessage;
  message_thread_id?: number;
}

/** Minimal Telegram Bot API `Update` object returned by getUpdates. */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramApiMessage;
  edited_message?: TelegramApiMessage;
  channel_post?: TelegramApiMessage;
}

export interface TelegramMessageOptions {
  /** Numeric user id of the bot that received this message (as a string). */
  botUserId?: string;
  /** Username of the bot that received this message (without the leading @). */
  botUsername?: string;
}

/**
 * Converts a Telegram Bot API `Message` into the provider-agnostic IMessage
 * shape used by the message pipeline.
 */
export class TelegramMessage extends IMessage {
  private message: TelegramApiMessage;
  private mentions: string[];
  private botUserId?: string;
  private botUsername?: string;

  constructor(message: TelegramApiMessage, options?: TelegramMessageOptions) {
    super(message, 'user', {
      chatType: message.chat.type,
      chatTitle: message.chat.title,
      threadId: message.message_thread_id,
    });
    this.message = message;
    this.content = message.text ?? message.caption ?? '';
    this.channelId = String(message.chat.id);
    this.platform = 'telegram';
    this.botUserId = options?.botUserId;
    this.botUsername = options?.botUsername;
    this.mentions = this.extractMentions();
  }

  public getMessageId(): string {
    return String(this.message.message_id);
  }

  public getTimestamp(): Date {
    return new Date(this.message.date * 1000);
  }

  public setText(text: string): void {
    this.content = text;
  }

  public getChannelId(): string {
    return String(this.message.chat.id);
  }

  public getAuthorId(): string {
    return this.message.from ? String(this.message.from.id) : '';
  }

  public getAuthorName(): string {
    const from = this.message.from;
    if (!from) {
      return 'Unknown';
    }
    const fullName = `${from.first_name || ''} ${from.last_name || ''}`.trim();
    return fullName || from.username || 'Unknown';
  }

  public getChannelTopic(): string | null {
    return this.message.chat.title ?? null;
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
    // Telegram @mentions are usernames; map the bot's numeric id to its username.
    if (this.botUserId && userId === this.botUserId && this.botUsername) {
      return this.mentions.includes(this.botUsername);
    }
    return false;
  }

  public isFromBot(): boolean {
    return Boolean(this.message.from?.is_bot);
  }

  public isDirectMessage(): boolean {
    return this.message.chat.type === 'private';
  }

  public isReplyToBot(): boolean {
    const repliedTo = this.message.reply_to_message?.from;
    if (!repliedTo) {
      return false;
    }
    if (this.botUserId && String(repliedTo.id) === this.botUserId) {
      return true;
    }
    return Boolean(repliedTo.is_bot);
  }

  /**
   * Extracts mentions from message entities:
   * - `mention` entities are @username references (resolved from the text).
   * - `text_mention` entities carry the mentioned user object directly.
   */
  private extractMentions(): string[] {
    const entities = [...(this.message.entities ?? []), ...(this.message.caption_entities ?? [])];
    const source = this.message.text ?? this.message.caption ?? '';
    const mentions = new Set<string>();

    for (const entity of entities) {
      if (entity.type === 'mention') {
        const raw = source.substring(entity.offset, entity.offset + entity.length);
        const username = raw.startsWith('@') ? raw.slice(1) : raw;
        if (username) {
          mentions.add(username);
        }
      } else if (entity.type === 'text_mention' && entity.user) {
        mentions.add(String(entity.user.id));
      }
    }
    return Array.from(mentions);
  }
}
