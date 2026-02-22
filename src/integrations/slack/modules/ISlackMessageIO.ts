import Debug from 'debug';
import type { KnownBlock } from '@slack/web-api';
import WebSocketService from '@src/server/services/WebSocketService';
import type { IMessage } from '@message/interfaces/IMessage';
import type { SlackBotManager } from '../SlackBotManager';
import SlackMessage from '../SlackMessage';

const debug = Debug('app:SlackMessageIO');

/**
 * ISlackMessageIO encapsulates Slack message input/output operations.
 * It owns the concrete webClient calls and returns domain messages.
 */
export interface ISlackMessageIO {
  sendMessageToChannel(
    channelId: string,
    text: string,
    botName?: string,
    threadId?: string,
    replyToMessageId?: string,
    blocks?: KnownBlock[]
  ): Promise<string>;

  sendTypingPlaceholder?(channelId: string, botName?: string, threadId?: string): Promise<void>;

  fetchMessages(channelId: string, limit?: number, botName?: string): Promise<IMessage[]>;
}

/**
 * Default implementation that uses SlackBotManager to access bots/webClient.
 */
export class SlackMessageIO implements ISlackMessageIO {
  private sendTails = new Map<string, Promise<any>>();
  private typingPlaceholders = new Map<
    string,
    { ts: string; channelId: string; threadId?: string; createdAt: number }
  >();
  private readonly TYPING_PLACEHOLDER_TTL_MS = 120000;

  constructor(
    private readonly getBotManager: (botName?: string) => SlackBotManager | undefined,
    private readonly getDefaultBotName: () => string,
    private readonly lastSentEventTs: Map<string, string>
  ) {}

  private async withQueue<T>(botName: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.sendTails.get(botName) || Promise.resolve();
    let resolveOut: (v: T) => void, rejectOut: (e: any) => void;
    const out = new Promise<T>((resolve, reject) => {
      resolveOut = resolve;
      rejectOut = reject;
    });
    const next = prev
      .then(() => fn())
      .then(
        (v) => {
          resolveOut!(v);
          return v;
        },
        (e) => {
          rejectOut!(e);
        }
      )
      .catch(() => undefined);
    this.sendTails.set(botName, next as unknown as Promise<any>);
    return out;
  }

  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async sendWithRetry(botInfo: any, options: any, maxRetries = 3): Promise<any> {
    let attempt = 0;

    while (true) {
      try {
        attempt += 1;
        return await botInfo.webClient.chat.postMessage(options);
      } catch (err: any) {
        const status = err?.status || err?.code || err?.data?.error;
        const retryAfter = Number(err?.data?.retry_after || err?.headers?.['retry-after'] || 0);
        const retryable =
          status === 429 ||
          status === 'ratelimited' ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;
        if (attempt >= maxRetries || !retryable) {
          throw err;
        }
        const base = retryAfter > 0 ? retryAfter * 1000 : 300;
        const backoff = base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
        debug(`postMessage retry attempt ${attempt}/${maxRetries} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
  }

  private async updateWithRetry(botInfo: any, options: any, maxRetries = 3): Promise<any> {
    let attempt = 0;

    while (true) {
      try {
        attempt += 1;
        return await botInfo.webClient.chat.update(options);
      } catch (err: any) {
        const status = err?.status || err?.code || err?.data?.error;
        const retryAfter = Number(err?.data?.retry_after || err?.headers?.['retry-after'] || 0);
        const retryable =
          status === 429 ||
          status === 'ratelimited' ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;
        if (attempt >= maxRetries || !retryable) {
          throw err;
        }
        const base = retryAfter > 0 ? retryAfter * 1000 : 300;
        const backoff = base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
        debug(`chat.update retry attempt ${attempt}/${maxRetries} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
  }

  private async deleteWithRetry(botInfo: any, options: any, maxRetries = 3): Promise<any> {
    let attempt = 0;

    while (true) {
      try {
        attempt += 1;
        return await botInfo.webClient.chat.delete(options);
      } catch (err: any) {
        const status = err?.status || err?.code || err?.data?.error;
        const retryAfter = Number(err?.data?.retry_after || err?.headers?.['retry-after'] || 0);
        const retryable =
          status === 429 ||
          status === 'ratelimited' ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;
        if (attempt >= maxRetries || !retryable) {
          throw err;
        }
        const base = retryAfter > 0 ? retryAfter * 1000 : 300;
        const backoff = base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
        debug(`chat.delete retry attempt ${attempt}/${maxRetries} in ${backoff}ms`);
        await this.sleep(backoff);
      }
    }
  }

  private getTypingKey(botName: string, channelId: string, threadId?: string): string {
    return `${botName}::${channelId}::${threadId || ''}`;
  }

  private consumeTypingPlaceholder(botName: string, channelId: string, threadId?: string) {
    const key = this.getTypingKey(botName, channelId, threadId);
    const entry = this.typingPlaceholders.get(key);
    if (!entry) {
      return null;
    }
    this.typingPlaceholders.delete(key);
    return entry;
  }

  public async sendTypingPlaceholder(
    channelId: string,
    botName?: string,
    threadId?: string
  ): Promise<void> {
    const targetBot = botName || this.getDefaultBotName();
    if (!channelId || !targetBot) {
      return;
    }

    const key = this.getTypingKey(targetBot, channelId, threadId);
    const existing = this.typingPlaceholders.get(key);
    const now = Date.now();
    const botManager = this.getBotManager(targetBot);
    if (!botManager) {
      return;
    }
    const botInfo = botManager.getAllBots()[0];
    if (!botInfo) {
      return;
    }

    if (existing) {
      if (now - existing.createdAt < this.TYPING_PLACEHOLDER_TTL_MS) {
        return;
      }
      this.typingPlaceholders.delete(key);
      try {
        await this.withQueue(targetBot, () =>
          this.deleteWithRetry(botInfo, { channel: existing.channelId, ts: existing.ts })
        );
      } catch (error) {
        debug(`Failed to delete stale typing placeholder: ${error}`);
      }
    }

    const options: any = {
      channel: channelId,
      text: '_is typing..._',
      username: botInfo.botUserName || 'SlackBot',
      icon_emoji: ':robot_face:',
      unfurl_links: false,
      unfurl_media: false,
      parse: 'none',
    };
    if (threadId) {
      options.thread_ts = threadId;
    }

    try {
      const result = await this.withQueue(targetBot, () => this.sendWithRetry(botInfo, options));
      if (result?.ts) {
        this.typingPlaceholders.set(key, {
          ts: String(result.ts),
          channelId,
          threadId,
          createdAt: now,
        });
      }
    } catch (error) {
      debug(`Failed to send typing placeholder: ${error}`);
    }
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    botName?: string,
    threadId?: string,
    replyToMessageId?: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    debug('sendMessageToChannel()', {
      channelId,
      textPreview: text?.substring(0, 50),
      botName,
      threadId,
    });

    if (!channelId || !text) {
      debug('Error: Missing channelId or text', { channelId, text: !!text });
      throw new Error('Channel ID and text are required');
    }

    const targetBot = botName || this.getDefaultBotName();
    const botManager = this.getBotManager(targetBot);
    if (!botManager) {
      debug(`Error: Bot ${targetBot} not found`);
      throw new Error(`Bot ${targetBot} not found`);
    }

    const bots = botManager.getAllBots();
    const botInfo = bots[0];
    if (!botInfo) {
      debug('Error: Bot not found');
      throw new Error('Bot not found');
    }

    // Basic immediate duplicate guard similar to SlackService behavior
    const lastSent = this.lastSentEventTs.get(targetBot);
    if (lastSent === Date.now().toString()) {
      debug(`Immediate duplicate message detected: ${lastSent}, skipping`);
      return '';
    }

    try {
      const t0 = Date.now();
      const resolvedThreadId = threadId || replyToMessageId;

      const options: any = {
        channel: channelId,
        text: text || 'No content provided',
        username: botInfo.botUserName || 'SlackBot',
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
        parse: 'none',
      };

      if (resolvedThreadId) {
        options.thread_ts = resolvedThreadId;
      }
      if (blocks?.length) {
        options.blocks = blocks;
      }

      debug(
        `Final text to post: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`
      );

      const placeholder = this.consumeTypingPlaceholder(targetBot, channelId, resolvedThreadId);
      if (placeholder?.ts) {
        try {
          const updateOptions: any = {
            channel: channelId,
            ts: placeholder.ts,
            text: options.text,
          };
          if (options.blocks) {
            updateOptions.blocks = options.blocks;
          }
          const updated = await this.withQueue(targetBot, () =>
            this.updateWithRetry(botInfo, updateOptions)
          );
          debug(`Updated typing placeholder in #${channelId}, ts=${updated.ts}`);
          return updated.ts || placeholder.ts;
        } catch (error) {
          debug(`Failed to update typing placeholder, falling back to new message: ${error}`);
          try {
            await this.withQueue(targetBot, () =>
              this.deleteWithRetry(botInfo, { channel: channelId, ts: placeholder.ts })
            );
          } catch (deleteError) {
            debug(`Failed to delete typing placeholder after update failure: ${deleteError}`);
          }
        }
      }

      const result = await this.withQueue(targetBot, () => this.sendWithRetry(botInfo, options));
      debug(
        `Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''}, ts=${result.ts}`
      );
      // Emit WebSocket monitoring event (outgoing)
      try {
        const ws = WebSocketService.getInstance();
        ws.recordMessageFlow({
          botName: botInfo.botUserName || 'SlackBot',
          provider: 'slack',
          channelId,
          userId: '',
          messageType: 'outgoing',
          contentLength: (text || '').length,
          processingTime: Date.now() - t0,
          status: 'success',
        });
      } catch {}
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      // Emit alert on failure
      try {
        const ws = WebSocketService.getInstance();
        ws.recordAlert({
          level: 'error',
          title: 'Slack sendMessage failed',
          message: String(error),
          botName: botName || this.getDefaultBotName(),
          metadata: { channelId },
        });
      } catch {}
      throw new Error(`Message send failed: ${error}`);
    }
  }

  public async fetchMessages(channelId: string, limit = 10, botName?: string): Promise<IMessage[]> {
    debug('fetchMessages()', { channelId, limit, botName });

    const targetBot = botName || this.getDefaultBotName();
    const botManager = this.getBotManager(targetBot);
    if (!botManager) {
      debug(`Error: Bot ${targetBot} not found`);
      return [];
    }

    const bots = botManager.getAllBots();
    const botInfo = bots[0];

    try {
      const result = await botInfo.webClient.conversations.history({ channel: channelId, limit });
      const messages = (result.messages || []).map(
        (msg) => new SlackMessage(msg.text || '', channelId, msg as any)
      );
      debug(`Fetched ${messages.length} messages from channel ${channelId}`);
      return messages;
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }
}
