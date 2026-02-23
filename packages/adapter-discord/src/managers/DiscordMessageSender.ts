import Debug from 'debug';
import { type NewsChannel, type TextChannel, type ThreadChannel } from 'discord.js';
import type { IServiceDependencies } from '@hivemind/shared-types';
import { type DiscordBotManager } from './DiscordBotManager';

const log = Debug('app:discordMessageSender');

export class DiscordMessageSender {
  private botManager: DiscordBotManager;
  private deps: IServiceDependencies;
  private messageRateLimit = new Map<string, number[]>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 3; // 3 messages per minute

  constructor(botManager: DiscordBotManager, deps: IServiceDependencies) {
    this.botManager = botManager;
    this.deps = deps;
  }

  public async sendTyping(
    channelId: string,
    senderName?: string,
    threadId?: string
  ): Promise<void> {
    try {
      const isSnowflake = (v: unknown) => /^\d{15,25}$/.test(String(v || ''));
      const bots = this.botManager.getAllBots();
      const botInfo =
        (senderName && isSnowflake(senderName)
          ? bots.find(
            (b) =>
              b.botUserId === senderName ||
              b.config?.BOT_ID === senderName ||
              b.config?.discord?.clientId === senderName
          )
          : bots.find((b) => b.botUserName === senderName || b.config?.name === senderName)) ||
        bots[0];

      log(
        `sendTyping: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`
      );

      if (threadId) {
        const thread = await botInfo.client.channels.fetch(threadId);
        if (thread && (thread as any).isTextBased?.()) {
          await (thread as any).sendTyping();
        }
        return;
      }

      const channel = await botInfo.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel | NewsChannel).sendTyping();
      }
    } catch (e) {
      log(`Error sending typing indicator to ${channelId}: ${e}`);
    }
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    replyToMessageId?: string
  ): Promise<string> {
    const { errorTypes, discordConfig, messageConfig, webSocketService, channelRouter } = this.deps;
    const { ConfigError, ValidationError, NetworkError } = errorTypes;

    // Input validation for security
    if (!channelId || typeof channelId !== 'string') {
      throw new ValidationError('Invalid channelId provided', 'DISCORD_INVALID_CHANNEL_ID');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      // Empty messages are rejected by Discord
      log(`Attempted to send empty message to ${channelId}`);
      return '';
    }

    // Sanitize malicious content patterns (basic XSS/Injection prevention)
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        throw new ValidationError(
          'Message contains potentially malicious content',
          'DISCORD_MALICIOUS_CONTENT'
        );
      }
    }

    const bots = this.botManager.getAllBots();
    if (bots.length === 0) {
      throw new ConfigError(
        'No Discord bot instances available',
        'DISCORD_NO_BOTS_AVAILABLE'
      );
    }

    // Rate limiting check - delay instead of error
    const rateLimitResult = this.checkRateLimitWithDelay(channelId);
    if (rateLimitResult.shouldWait) {
      log(`Rate limit: waiting ${rateLimitResult.waitMs}ms before sending to ${channelId}`);
      await new Promise((resolve) => setTimeout(resolve, rateLimitResult.waitMs));
    }

    const isSnowflake = (v: unknown) => /^\d{15,25}$/.test(String(v || ''));
    const botInfo =
      (senderName && isSnowflake(senderName)
        ? bots.find(
          (b) =>
            b.botUserId === senderName ||
            b.config?.BOT_ID === senderName ||
            b.config?.discord?.clientId === senderName
        )
        : bots.find((b) => b.botUserName === senderName || b.config?.name === senderName)) ||
      bots[0];
    const effectiveSenderName = botInfo.botUserName;

    log(
      `sendMessageToChannel: senderName="${senderName}" -> selected bot "${botInfo.botUserName}" (id: ${botInfo.botUserId})`
    );

    // Feature-flagged channel routing: select best channel among candidates
    let selectedChannelId = channelId;
    try {
      const enabled = Boolean(messageConfig?.get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
      if (enabled && channelRouter) {
        const defaultChannel =
          (discordConfig?.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';

        const candidates = Array.from(
          new Set([channelId, defaultChannel].filter(Boolean))
        ) as string[];
        if (candidates.length > 0) {
          const picked = channelRouter.pickBestChannel?.(candidates, {
            provider: 'discord',
            botName: botInfo.botUserName,
          }) ?? channelId;
          if (picked) {
            selectedChannelId = picked;
            log(
              `ChannelRouter enabled: candidates=${JSON.stringify(candidates)} selected=${selectedChannelId}`
            );
          } else {
            log(`ChannelRouter returned null; falling back to provided channelId=${channelId}`);
          }
        }
      }
    } catch (err: any) {
      log(`ChannelRouter disabled due to error or misconfig: ${err?.message ?? err}`);
      selectedChannelId = channelId;
    }

    try {
      log(`Sending to channel ${selectedChannelId} as ${effectiveSenderName}`);
      const channel = await botInfo.client.channels.fetch(selectedChannelId);
      if (!channel || !channel.isTextBased()) {
        throw new ValidationError(
          `Channel ${selectedChannelId} is not text-based or was not found`,
          'DISCORD_INVALID_CHANNEL'
        );
      }

      let message;

      // Prepare message payload
      const payload: any = { content: text };
      if (replyToMessageId) {
        payload.reply = { messageReference: replyToMessageId, failIfNotExists: false };
      }

      if (threadId) {
        const thread = await botInfo.client.channels.fetch(threadId);
        if (!thread || !thread.isThread()) {
          throw new ValidationError(
            `Thread ${threadId} is not a valid thread or was not found`,
            'DISCORD_INVALID_THREAD'
          );
        }
        message = await thread.send(payload);
      } else {
        log(
          `Attempting send to channel ${selectedChannelId}: *${effectiveSenderName}*: ${text} ${replyToMessageId ? `(replying to ${replyToMessageId})` : ''}`
        );
        message = await (channel as TextChannel | NewsChannel | ThreadChannel).send(payload);
      }

      log(
        `Sent message ${message.id} to channel ${selectedChannelId}${threadId ? `/${threadId}` : ''}`
      );
      // Emit outgoing message flow event
      try {
        webSocketService?.recordMessageFlow({
          botName: botInfo.botUserName,
          provider: 'discord',
          channelId: selectedChannelId,
          userId: '',
          messageType: 'outgoing',
          contentLength: (text || '').length,
          status: 'success',
        });
      } catch { }
      return message.id;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        log(
          `Validation error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${error.message}`
        );
        this.deps.logger.error(`[${effectiveSenderName}] Discord send message validation error:`, error);
        try {
          webSocketService?.recordAlert({
            level: 'error',
            title: 'Discord sendMessage validation failed',
            message: error.message,
            botName: botInfo.botUserName,
            metadata: { channelId: selectedChannelId, errorType: 'ValidationError' },
          });
        } catch { }
        return '';
      }

      const networkError = new NetworkError(
        `Failed to send message to channel ${selectedChannelId}: ${error instanceof Error ? error.message : String(error)}`,
        { status: 500, data: 'DISCORD_SEND_MESSAGE_ERROR' } as any,
        { url: selectedChannelId, originalError: error } as any
      );

      log(
        `Network error sending to ${selectedChannelId}${threadId ? `/${threadId}` : ''}: ${networkError.message}`
      );
      this.deps.logger.error(`[${effectiveSenderName}] Discord send message network error:`, networkError);
      try {
        webSocketService?.recordAlert({
          level: 'error',
          title: 'Discord sendMessage failed',
          message: networkError.message,
          botName: botInfo.botUserName,
          metadata: { channelId: selectedChannelId, errorType: 'NetworkError' },
        });
      } catch { }
      return '';
    }
  }

  public async sendPublicAnnouncement(
    channelId: string,
    announcement: string,
    threadId?: string
  ): Promise<void> {
    const bots = this.botManager.getAllBots();
    const botInfo = bots[0];
    const text = `**Announcement**: ${announcement}`;
    await this.sendMessageToChannel(channelId, text, botInfo.botUserName, threadId);
  }

  private checkRateLimitWithDelay(channelId: string): { shouldWait: boolean; waitMs: number } {
    const now = Date.now();
    const channelKey = `channel_${channelId}`;

    if (!this.messageRateLimit.has(channelKey)) {
      this.messageRateLimit.set(channelKey, []);
    }

    const timestamps = this.messageRateLimit.get(channelKey)!;

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.RATE_LIMIT_WINDOW);
    this.messageRateLimit.set(channelKey, validTimestamps);

    // Check if under limit
    if (validTimestamps.length >= this.RATE_LIMIT_MAX) {
      // Calculate how long to wait until oldest timestamp expires
      const oldestTimestamp = Math.min(...validTimestamps);
      const waitMs = this.RATE_LIMIT_WINDOW - (now - oldestTimestamp) + 1000; // +1s buffer
      return { shouldWait: true, waitMs: Math.max(1000, waitMs) };
    }

    // Add current timestamp
    validTimestamps.push(now);
    return { shouldWait: false, waitMs: 0 };
  }
}
