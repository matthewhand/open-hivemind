import Debug from 'debug';
import type { IMessage, IMessengerService } from '@hivemind/shared-types';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { TelegramMessage, type TelegramApiMessage, type TelegramUpdate } from './TelegramMessage';
import { TelegramPoller, type FetchLike } from './TelegramPoller';

const debug = Debug('app:TelegramService:verbose');

const DEFAULT_API_BASE_URL = 'https://api.telegram.org';

interface TelegramBotInstance {
  name: string;
  botToken: string;
  /** Default chat id for outbound messages (optional). */
  chatId?: string;
  /** Numeric bot id derived from the token prefix or getMe. */
  botUserId?: string;
  /** Bot username resolved via getMe (without the leading @). */
  botUsername?: string;
  llmProvider?: string;
}

/**
 * Telegram messenger service.
 *
 * Receives messages by long-polling the Bot API getUpdates endpoint (one
 * poller per configured bot, see TelegramPoller) and sends messages via
 * sendMessage. Dependency-free: talks to api.telegram.org with fetch.
 */
export class TelegramService implements IMessengerService {
  private static instance: TelegramService | undefined;

  public readonly providerName = 'telegram';
  public supportsChannelPrioritization = false;

  private bots = new Map<string, TelegramBotInstance>();
  private pollers = new Map<string, TelegramPoller>();
  private messageHandler?: (
    message: IMessage,
    historyMessages: IMessage[],
    botConfig: any
  ) => Promise<string | null>;

  private readonly apiBaseUrl: string;
  private readonly fetchFn: FetchLike;

  private constructor(options?: { apiBaseUrl?: string; fetchFn?: FetchLike }) {
    this.apiBaseUrl = (options?.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    this.fetchFn = options?.fetchFn ?? (fetch as unknown as FetchLike);
    debug('Initializing TelegramService with multi-instance support');
    this.initializeFromConfiguration();
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  /** Test-only: build an instance with injected fetch/base URL. */
  public static createForTesting(options?: {
    apiBaseUrl?: string;
    fetchFn?: FetchLike;
  }): TelegramService {
    return new TelegramService(options);
  }

  private initializeFromConfiguration(): void {
    const configManager = BotConfigurationManager.getInstance();
    const telegramBotConfigs = configManager
      .getAllBots()
      .filter((bot) => bot.messageProvider === 'telegram' && bot.telegram?.botToken);

    if (telegramBotConfigs.length === 0) {
      debug('No Telegram bot configurations found');
      return;
    }

    debug(`Initializing ${telegramBotConfigs.length} Telegram bot instances`);
    for (const botConfig of telegramBotConfigs) {
      const token = botConfig.telegram!.botToken;
      this.bots.set(botConfig.name, {
        name: botConfig.name,
        botToken: token,
        chatId: botConfig.telegram!.chatId,
        // Token format is <bot_id>:<secret>; the prefix is the numeric bot id.
        botUserId: token.includes(':') ? token.split(':')[0] : undefined,
        llmProvider: botConfig.llmProvider,
      });
    }
  }

  public async initialize(): Promise<void> {
    debug('Initializing Telegram connections...');
    for (const bot of this.bots.values()) {
      try {
        const me = await this.apiCall(bot, 'getMe');
        if (me?.id != null) {
          bot.botUserId = String(me.id);
        }
        if (me?.username) {
          bot.botUsername = String(me.username);
        }
        debug(`Resolved Telegram identity for ${bot.name}: @${bot.botUsername ?? 'unknown'}`);
      } catch (error: unknown) {
        // Identity resolution is best-effort; polling will surface auth errors.
        debug(
          `getMe failed for bot ${bot.name}: %s`,
          error instanceof Error ? error.message : String(error)
        );
      }
      this.startPolling(bot.name);
    }
  }

  public setMessageHandler(
    handler: (
      message: IMessage,
      historyMessages: IMessage[],
      botConfig: any
    ) => Promise<string | null>
  ): void {
    debug('Setting message handler for Telegram bots');
    if (typeof handler !== 'function') {
      throw new Error('Message handler must be a function');
    }
    this.messageHandler = handler;
    for (const botName of this.bots.keys()) {
      this.startPolling(botName);
    }
  }

  /**
   * Starts the long-poll loop for one bot. Requires a registered message
   * handler so received updates are never silently confirmed and dropped.
   * Idempotent per bot; safe to call from both initialize() and
   * setMessageHandler() regardless of ordering.
   */
  private startPolling(botName: string): void {
    if (!this.messageHandler || this.pollers.has(botName)) {
      return;
    }
    const bot = this.bots.get(botName);
    if (!bot) {
      return;
    }

    const poller = new TelegramPoller({
      token: bot.botToken,
      apiBaseUrl: this.apiBaseUrl,
      fetchFn: this.fetchFn,
      onUpdate: (update) => this.handleUpdate(botName, update),
    });
    this.pollers.set(botName, poller);
    poller.start();
    debug(`Started Telegram long-poll loop for bot: ${botName}`);
  }

  private async handleUpdate(botName: string, update: TelegramUpdate): Promise<void> {
    if (!this.messageHandler) {
      return;
    }
    const apiMessage: TelegramApiMessage | undefined = update.message;
    if (!apiMessage) {
      return;
    }

    const bot = this.bots.get(botName);
    if (!bot) {
      return;
    }

    // Ignore the bot's own messages to avoid feedback loops.
    if (apiMessage.from && bot.botUserId && String(apiMessage.from.id) === bot.botUserId) {
      return;
    }

    try {
      const message = new TelegramMessage(apiMessage, {
        botUserId: bot.botUserId,
        botUsername: bot.botUsername,
      });

      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'telegram',
          llmProvider: bot.llmProvider,
          channelId: message.getChannelId(),
          userId: message.getAuthorId(),
          messageType: 'incoming',
          contentLength: message.getText().length,
          status: 'success',
        });
      } catch {
        // Monitoring is best-effort.
      }

      await this.messageHandler(message, [], {
        name: botName,
        BOT_NAME: botName,
        llmProvider: bot.llmProvider,
        telegram: { chatId: bot.chatId },
      });
    } catch (error: unknown) {
      debug(
        `Error handling incoming Telegram update for ${botName}: %s`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    replyToMessageId?: string
  ): Promise<string> {
    const bot = this.resolveBot(senderName);
    if (!bot) {
      throw new Error('No Telegram bot instances configured');
    }

    const payload: Record<string, unknown> = {
      chat_id: channelId,
      text,
    };
    if (threadId) {
      payload.message_thread_id = Number(threadId);
    }
    if (replyToMessageId) {
      payload.reply_to_message_id = Number(replyToMessageId);
    }

    const result = await this.apiCall(bot, 'sendMessage', payload);
    if (result?.message_id == null) {
      throw new Error('Telegram sendMessage returned a malformed response');
    }
    debug(`[${bot.name}] Sent message to chat ${channelId}`);
    return String(result.message_id);
  }

  public async getMessagesFromChannel(_channelId: string, _limit?: number): Promise<IMessage[]> {
    // The Telegram Bot API does not expose message history; incoming
    // messages are only available through getUpdates/webhooks.
    debug('getMessagesFromChannel: Telegram Bot API does not support history retrieval');
    return [];
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text =
      typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';
    for (const bot of this.bots.values()) {
      try {
        await this.apiCall(bot, 'sendMessage', { chat_id: channelId, text });
        debug(`[${bot.name}] Sent announcement to chat ${channelId}`);
      } catch (error: unknown) {
        debug(
          `[${bot.name}] Failed to send announcement: %s`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  public getClientId(): string {
    const bot = this.resolveBot();
    return bot?.botUserId || bot?.name || 'telegram-bot';
  }

  public getDefaultChannel(): string {
    const bot = this.resolveBot();
    return bot?.chatId || '';
  }

  public async getChannelTopic(_channelId: string): Promise<string | null> {
    return null;
  }

  public async sendTyping(channelId: string, senderName?: string): Promise<void> {
    try {
      const bot = this.resolveBot(senderName);
      if (!bot) {
        return;
      }
      await this.apiCall(bot, 'sendChatAction', { chat_id: channelId, action: 'typing' });
    } catch (error: unknown) {
      debug('sendTyping failed: %s', error instanceof Error ? error.message : String(error));
    }
  }

  public getBotNames(): string[] {
    return Array.from(this.bots.keys());
  }

  public isConnected(botName?: string): boolean {
    if (botName) {
      return this.pollers.get(botName)?.isRunning() ?? false;
    }
    for (const poller of this.pollers.values()) {
      if (poller.isRunning()) {
        return true;
      }
    }
    return false;
  }

  public async shutdown(): Promise<void> {
    debug('Shutting down TelegramService...');
    await Promise.all(Array.from(this.pollers.values()).map((poller) => poller.stop()));
    this.pollers.clear();
    this.messageHandler = undefined;
    TelegramService.instance = undefined;
  }

  private resolveBot(senderName?: string): TelegramBotInstance | undefined {
    if (senderName && this.bots.has(senderName)) {
      return this.bots.get(senderName);
    }
    const first = this.bots.keys().next();
    return first.done ? undefined : this.bots.get(first.value);
  }

  /**
   * Performs a Telegram Bot API call and returns the `result` payload.
   * Throws on transport errors and on `ok: false` API responses.
   */
  private async apiCall(
    bot: TelegramBotInstance,
    method: string,
    payload?: Record<string, unknown>
  ): Promise<any> {
    const response = await this.fetchFn(`${this.apiBaseUrl}/bot${bot.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    if (!response.ok) {
      throw new Error(`Telegram ${method} returned HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data?.ok) {
      throw new Error(`Telegram ${method} error: ${data?.description ?? 'malformed response'}`);
    }
    return data.result;
  }
}

export default TelegramService;
