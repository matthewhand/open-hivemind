import { KnownBlock } from '@slack/web-api';
import { IMessage } from '@message/interfaces/IMessage';
import SlackMessage from '../SlackMessage';
import Debug from 'debug';
import { SlackBotManager } from '../SlackBotManager';

const debug = Debug('app:SlackMessageIO');

interface QueuedMessage {
  channelId: string;
  text: string;
  botName?: string;
  threadId?: string;
  blocks?: KnownBlock[];
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  retryCount: number;
  timestamp: number;
}

interface RateLimitConfig {
  maxConcurrent: number;
  baseDelay: number;
  maxDelay: number;
  retryAttempts: number;
}

interface BotRateLimit {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}

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
  private messageQueue: QueuedMessage[] = [];
  private processing = false;
  private activeSends = 0;
  private botRateLimits: Map<string, BotRateLimit> = new Map();
  private readonly rateLimitConfig: RateLimitConfig = {
    maxConcurrent: 3, // Slack allows ~1 message per second per bot
    baseDelay: 1000, // 1 second base delay
    maxDelay: 30000, // 30 seconds max delay
    retryAttempts: 3
  };

  constructor(private readonly getBotManager: (botName?: string) => SlackBotManager | undefined,
              private readonly getDefaultBotName: () => string,
              private readonly lastSentEventTs: Map<string, string>) {
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    botName?: string,
    threadId?: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const queuedMessage: QueuedMessage = {
        channelId,
        text,
        botName,
        threadId,
        blocks,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      };

      this.messageQueue.push(queuedMessage);
      debug(`Message queued for channel ${channelId}. Queue size: ${this.messageQueue.length}`);
      
      this.processQueue();
    });
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

  private async processQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    this.processing = true;
    debug(`Starting queue processing. Queue size: ${this.messageQueue.length}, Active sends: ${this.activeSends}`);

    while (this.messageQueue.length > 0 && this.activeSends < this.rateLimitConfig.maxConcurrent) {
      const message = this.messageQueue.shift();
      if (message) {
        this.activeSends++;
        this.sendQueuedMessage(message).finally(() => {
          this.activeSends--;
          // Continue processing if there are more messages
          if (this.messageQueue.length > 0) {
            setTimeout(() => this.processQueue(), 100);
          }
        });
      }
    }

    this.processing = false;
  }

  private async sendQueuedMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { channelId, text, botName, threadId, blocks, resolve, reject, retryCount } = queuedMessage;
    
    try {
      const targetBot = botName || this.getDefaultBotName();
      await this.enforceRateLimit(targetBot);
      
      const result = await this.executeSend(channelId, text, targetBot, threadId, blocks);
      
      this.updateRateLimit(targetBot);
      resolve(result);
      
    } catch (error: any) {
      debug(`Error sending message to channel ${channelId}:`, error);
      
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateRetryDelay(retryCount, error);
        debug(`Retrying message to ${channelId} in ${delay}ms (attempt ${retryCount + 1})`);
        
        setTimeout(() => {
          queuedMessage.retryCount++;
          this.messageQueue.unshift(queuedMessage); // Add back to front of queue
          this.processQueue();
        }, delay);
      } else {
        reject(new Error(`Failed to send message after ${retryCount} retries: ${error.message}`));
      }
    }
  }

  private async executeSend(
    channelId: string,
    text: string,
    botName: string,
    threadId?: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    debug('executeSend()', { channelId, textPreview: text?.substring(0, 50), botName, threadId });

    if (!channelId || !text) {
      throw new Error('Channel ID and text are required');
    }

    const botManager = this.getBotManager(botName);
    if (!botManager) {
      throw new Error(`Bot ${botName} not found`);
    }

    const bots = botManager.getAllBots();
    const botInfo = bots[0];
    if (!botInfo) {
      throw new Error('Bot not found');
    }

    // Basic immediate duplicate guard
    const lastSent = this.lastSentEventTs.get(botName);
    if (lastSent === Date.now().toString()) {
      debug(`Immediate duplicate message detected: ${lastSent}, skipping`);
      return '';
    }

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

    debug(`Sending message: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`);
    const result = await botInfo.webClient.chat.postMessage(options);
    
    if (result.ts) {
      this.lastSentEventTs.set(channelId, result.ts);
      debug(`Message sent to channel ${channelId} with timestamp ${result.ts}`);
      return result.ts;
    } else {
      throw new Error('Failed to send message: no timestamp returned');
    }
  }

  private async enforceRateLimit(botName: string): Promise<void> {
    const rateLimit = this.botRateLimits.get(botName);
    if (!rateLimit) return;

    const now = Date.now();
    const timeSinceLastRequest = now - rateLimit.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitConfig.baseDelay) {
      const delay = this.rateLimitConfig.baseDelay - timeSinceLastRequest;
      debug(`Rate limiting ${botName}: waiting ${delay}ms`);
      await this.sleep(delay);
    }
  }

  private updateRateLimit(botName: string): void {
    const now = Date.now();
    const existing = this.botRateLimits.get(botName);
    
    this.botRateLimits.set(botName, {
      lastRequestTime: now,
      requestCount: (existing?.requestCount || 0) + 1,
      resetTime: now + 60000 // Reset counter every minute
    });
  }

  private shouldRetry(error: any, retryCount: number): boolean {
    if (retryCount >= this.rateLimitConfig.retryAttempts) {
      return false;
    }

    // Retry on rate limit errors (429) or server errors (5xx)
    if (error.data?.error === 'rate_limited' || 
        error.status === 429 ||
        (error.status >= 500 && error.status < 600)) {
      return true;
    }

    // Retry on network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  private calculateRetryDelay(retryCount: number, error: any): number {
    let baseDelay = this.rateLimitConfig.baseDelay;
    
    // Use longer delay for rate limit errors
    if (error.data?.error === 'rate_limited' || error.status === 429) {
      // Check if Slack provided a retry-after header
      const retryAfter = error.headers?.['retry-after'];
      if (retryAfter) {
        return Math.min(parseInt(retryAfter) * 1000, this.rateLimitConfig.maxDelay);
      }
      baseDelay = 5000; // 5 seconds for rate limits
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.rateLimitConfig.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}