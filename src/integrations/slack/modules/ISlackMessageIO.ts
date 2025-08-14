import { KnownBlock } from '@slack/web-api';
import { IMessage } from '@message/interfaces/IMessage';
import SlackMessage from '../SlackMessage';
import Debug from 'debug';
import { retry, defaultShouldRetry } from '@src/utils/retry';
import { createDefaultSlackSendQueue } from '@src/utils/rateLimitQueue';
import { SlackBotManager } from '../SlackBotManager';

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
    blocks?: KnownBlock[]
  ): Promise<string>;

  fetchMessages(
    channelId: string,
    limit?: number,
    botName?: string
  ): Promise<IMessage[]>;
}

/**
 * Default implementation that uses SlackBotManager to access bots/webClient.
 */
export class SlackMessageIO implements ISlackMessageIO {
  private sendQueue = createDefaultSlackSendQueue();

  constructor(private readonly getBotManager: (botName?: string) => SlackBotManager | undefined,
              private readonly getDefaultBotName: () => string,
              private readonly lastSentEventTs: Map<string, string>) {}

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    botName?: string,
    threadId?: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    debug('sendMessageToChannel()', { channelId, textPreview: text?.substring(0, 50), botName, threadId });

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
      const options: any = {
        channel: channelId,
        text: text || 'No content provided',
        username: botInfo.botUserName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
        parse: 'none',
      };

      if (threadId) options.thread_ts = threadId;
      if (blocks?.length) options.blocks = blocks;

      debug(`Final text to post: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`);

      const doPost = async () => {
        const result = await botInfo.webClient.chat.postMessage(options);
        debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''}, ts=${result.ts}`);
        return result;
      };

      const retries = Number(process.env.SLACK_SEND_RETRIES ?? 3);
      const minDelayMs = Number(process.env.SLACK_SEND_MIN_DELAY_MS ?? 300);
      const maxDelayMs = Number(process.env.SLACK_SEND_MAX_DELAY_MS ?? 5000);

      const callWithRetry = () => retry(doPost, {
        retries,
        minDelayMs,
        maxDelayMs,
        jitter: 'full',
        shouldRetry: (err, attempt) => {
          const retryable = defaultShouldRetry(err, attempt);
          if (!retryable) debug('not retryable error', { err: err?.message || String(err) });
          return retryable;
        },
        onRetry: (err, attempt, delayMs) => {
          const retryAfter = err?.data?.retry_after || err?.response?.headers?.['retry-after'];
          debug('retrying Slack send', { attempt, delayMs, retryAfter });
        }
      });

      const exec = async () => {
        const { ts } = await callWithRetry();
        return ts || '';
      };

      if (this.sendQueue) {
        try {
          const { setGauge } = require('@src/utils/metrics');
          setGauge('slack.send.queue_depth', (this as any).sendQueue['queue']?.length ?? 0);
        } catch {}
        return await this.sendQueue.enqueue(exec);
      }
      return await exec();
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      throw new Error(`Message send failed: ${error}`);
    }
  }

  public async fetchMessages(
    channelId: string,
    limit: number = 10,
    botName?: string
  ): Promise<IMessage[]> {
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
      const messages = (result.messages || []).map(msg =>
        new SlackMessage(msg.text || '', channelId, msg)
      );
      debug(`Fetched ${messages.length} messages from channel ${channelId}`);
      return messages;
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }
}