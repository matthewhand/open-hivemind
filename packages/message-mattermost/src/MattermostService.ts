import { EventEmitter } from 'events';
import Debug from 'debug';
import type { Application } from 'express';
import type { IMessage, IMessengerService } from '@hivemind/shared-types';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import {
  ApiError,
  BaseHivemindError,
  ConfigurationError,
  NetworkError,
  ValidationError,
} from '@src/types/errorClasses';
import { ErrorUtils } from '@src/types/errors';
import { createErrorResponse } from '@src/utils/errorResponse';
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';
import MattermostClient from './mattermostClient';
import { MattermostMessage, type MattermostPost } from './MattermostMessage';

const debug = Debug('app:MattermostService:verbose');

const metrics = MetricsCollector.getInstance();

export class MattermostService extends EventEmitter implements IMessengerService {
  private static instance: MattermostService | undefined;
  private clients = new Map<string, MattermostClient>();
  private channels = new Map<string, string>();
  private botConfigs = new Map<string, any>();
  private app?: Application;
  private messageHandler?: (
    message: IMessage,
    historyMessages: IMessage[],
    botConfig: any
  ) => Promise<string | null>;
  private subscribedBots = new Set<string>();
  private lastModelActivity = new Map<string, string>();

  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    super();
    debug('Initializing MattermostService with multi-instance support');
    this.initializeFromConfiguration();
  }

  private initializeFromConfiguration(): void {
    const configManager = BotConfigurationManager.getInstance();
    const mattermostBotConfigs = configManager
      .getAllBots()
      .filter((bot) => bot.messageProvider === 'mattermost' && bot.mattermost?.token);

    if (mattermostBotConfigs.length === 0) {
      debug('No Mattermost bot configurations found');
      return;
    }

    debug(`Initializing ${mattermostBotConfigs.length} Mattermost bot instances`);

    for (const botConfig of mattermostBotConfigs) {
      this.initializeBotInstance(botConfig);
    }
  }

  private initializeBotInstance(botConfig: any): void {
    const botName = botConfig.name;

    if (!botConfig.mattermost?.serverUrl || !botConfig.mattermost?.token) {
      debug(`Invalid Mattermost configuration for bot: ${botName}`);
      return;
    }

    debug(`Initializing Mattermost bot: ${botName}`);

    const client = new MattermostClient({
      serverUrl: botConfig.mattermost.serverUrl,
      token: botConfig.mattermost.token,
    });

    this.clients.set(botName, client);
    this.channels.set(botName, botConfig.mattermost.channel || 'town-square');
    this.botConfigs.set(botName, {
      name: botName,
      serverUrl: botConfig.mattermost.serverUrl,
      token: botConfig.mattermost.token,
      channel: botConfig.mattermost.channel || 'town-square',
      userId: botConfig.mattermost.userId || botConfig.BOT_ID || '',
      username: botConfig.mattermost.username || botConfig.MESSAGE_USERNAME_OVERRIDE || '',
      llmProvider: botConfig.llmProvider,
    });
  }

  public static getInstance(): MattermostService {
    if (!MattermostService.instance) {
      MattermostService.instance = new MattermostService();
    }
    return MattermostService.instance;
  }

  /**
   * Hot-adds a bot to the running service.
   *
   * Mirrors the per-bot setup performed by the constructor + initialize():
   * registers the client/config maps, connects the client (which opens its
   * WebSocket once a post handler is attached), refreshes the resolved
   * identity, and subscribes the bot to the global message handler if one is
   * already registered.
   *
   * Idempotent per bot name: calling it again for an existing bot simply
   * re-connects that bot's client, so it is safe to use as a
   * ReconnectionManager connect function.
   *
   * @param botConfig - Bot configuration in the same shape used by
   *   BotConfigurationManager entries (`{ name, mattermost: { serverUrl, token, ... } }`).
   */
  public async addBot(botConfig: any): Promise<void> {
    const botName = String(botConfig?.name || '').trim();
    if (!botName) {
      throw new ValidationError(
        'Bot name is required to add a Mattermost bot',
        'name',
        botConfig?.name
      );
    }

    if (!this.clients.has(botName)) {
      this.initializeBotInstance(botConfig);
      if (!this.clients.has(botName)) {
        throw new ConfigurationError(
          `Invalid Mattermost configuration for bot ${botName}: serverUrl and token are required`,
          'mattermost'
        );
      }
    }

    const client = this.clients.get(botName)!;
    await client.connect();

    const cfg = this.botConfigs.get(botName) || {};
    this.botConfigs.set(botName, {
      ...cfg,
      userId: client.getCurrentUserId?.() || cfg.userId,
      username: client.getCurrentUsername?.() || cfg.username,
    });

    // Wire incoming posts through the global handler if one is registered;
    // otherwise setMessageHandler() will pick this bot up later.
    this.subscribeBot(botName);
    debug(`Hot-added Mattermost bot: ${botName}`);
  }

  public async initialize(): Promise<void> {
    debug('Initializing Mattermost connections...');

    for (const [botName, client] of this.clients) {
      try {
        await client.connect();
        debug(`Connected to Mattermost server for bot: ${botName}`);
        const botConfig = this.botConfigs.get(botName) || {};
        this.botConfigs.set(botName, {
          ...botConfig,
          userId: client.getCurrentUserId?.() || botConfig.userId,
          username: client.getCurrentUsername?.() || botConfig.username,
        });
        // If a handler was registered before connect(), wire the incoming
        // subscription now that the client (and its WebSocket) is live.
        this.subscribeBot(botName);
      } catch (error) {
        debug(`Failed to connect to Mattermost for bot ${botName}:`, error);
        throw error;
      }
    }

    // Service readiness is now handled centrally by the main application
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(
    handler: (
      message: IMessage,
      historyMessages: IMessage[],
      botConfig: any
    ) => Promise<string | null>
  ): void {
    debug('Setting message handler for Mattermost bots');
    if (typeof handler !== 'function') {
      throw new Error('Message handler must be a function');
    }
    this.messageHandler = handler;
    for (const botName of this.clients.keys()) {
      this.subscribeBot(botName);
    }
  }

  /**
   * Subscribes a single bot's client to incoming `posted` WebSocket events and
   * routes each (non-self) post through the registered message handler.
   * Idempotent per bot so it can be called from both setMessageHandler() and
   * initialize() regardless of ordering.
   */
  private subscribeBot(botName: string): void {
    if (!this.messageHandler || this.subscribedBots.has(botName)) {
      return;
    }
    const client = this.clients.get(botName);
    if (!client || typeof client.onPost !== 'function') {
      return;
    }

    this.subscribedBots.add(botName);
    client.onPost((post) => {
      void this.handleIncomingPost(botName, post);
    });
  }

  private async handleIncomingPost(botName: string, post: MattermostPost): Promise<void> {
    if (!this.messageHandler) {
      return;
    }
    const botConfig = this.botConfigs.get(botName) || {};

    // Ignore the bot's own posts to avoid feedback loops.
    const selfUserId = this.clients.get(botName)?.getCurrentUserId?.() || botConfig.userId;
    if (selfUserId && post.user_id === selfUserId) {
      return;
    }

    try {
      const client = this.clients.get(botName);
      let username = 'Unknown';
      let isBot = false;
      try {
        const user = post.user_id ? await client?.getUser(post.user_id) : null;
        if (user) {
          username =
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown';
          isBot = Boolean(user.is_bot);
        }
      } catch (err: any) {
        debug(`Failed to resolve Mattermost user ${post.user_id}: ${err?.message}`);
      }

      const message = new MattermostMessage(post, username, {
        isBot,
        botUsername: botConfig.username,
        botUserId: selfUserId,
      });

      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'mattermost',
          llmProvider: botConfig.llmProvider,
          channelId: post.channel_id,
          userId: post.user_id,
          messageType: 'incoming',
          contentLength: (post.message || '').length,
          status: 'success',
        });
      } catch {}

      await this.messageHandler(message, [], { ...botConfig, BOT_NAME: botName });
    } catch (error: any) {
      debug(`Error handling incoming Mattermost post for ${botName}: ${error?.message}`);
    }
  }

  public async sendMessage(channelId: string, text: string, senderName?: string): Promise<string> {
    return this.sendMessageToChannel(channelId, text, senderName);
  }

  public async getMessages(channelId: string, limit?: number): Promise<IMessage[]> {
    return this.getMessagesFromChannel(channelId, limit);
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    replyToMessageId?: string
  ): Promise<string> {
    debug('Entering sendMessageToChannel (delegated)', {
      channelId,
      textPreview: text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : '',
      senderName,
      threadId,
    });

    const startTime = Date.now();
    let attemptCount = 0;

    const maxRetries = 3;
    const baseDelay = 1000;
    const maxDelay = 5000;

    let result = '';
    let lastError: any = null;

    try {
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        attemptCount = attempt;
        debug(`Attempting to send message (attempt ${attempt})`);

        try {
          const botName = senderName || Array.from(this.clients.keys())[0];
          const client = this.clients.get(botName);

          if (!client) {
            const errorMsg = `Bot ${botName} not found`;
            debug(errorMsg);
            throw new ValidationError(errorMsg, 'senderName', botName);
          }

          const rootId = threadId || replyToMessageId;
          const post = await client.postMessage({
            channel: channelId,
            text: text,
            ...(rootId ? { root_id: rootId } : {}),
          });

          debug(`[${botName}] Sent message to channel ${channelId}`);
          result = post.id;
          break; // Success
        } catch (error: any) {
          lastError = error;
          debug(`Send message attempt ${attempt} failed: ${error.message}`);

          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            throw new ValidationError(error.message, 'channelId', channelId);
          }

          const hivemindError = ErrorUtils.toHivemindError(error);
          const errType = (hivemindError as any).type;

          if (error.status === 403 || error.status === 404 || error.status === 400) {
            throw new ValidationError(
              error.message || 'Mattermost API Validation Error',
              'channelId',
              channelId
            );
          }

          const isRetryable =
            errType === 'network' ||
            errType === 'api' ||
            error.status === 500 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504 ||
            error.status === 429;

          if (isRetryable && attempt <= maxRetries) {
            const delay = Math.min(
              maxDelay,
              baseDelay * Math.pow(2, attempt - 1) + Math.random() * baseDelay
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (isRetryable) {
            throw new NetworkError(
              error.message || 'Mattermost API Network Error',
              { status: error.status },
              { url: 'mattermost_api' }
            );
          }

          throw hivemindError;
        }
      }

      const duration = Date.now() - startTime;
      metrics.incrementMessages();
      metrics.recordResponseTime(duration);
      debug(`Message sent successfully after ${attemptCount} attempts in ${duration}ms`);

      // Record success event
      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        const botName = senderName || Array.from(this.clients.keys())[0];
        const botConfig = this.botConfigs.get(botName);
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'mattermost',
          llmProvider: botConfig?.llmProvider,
          channelId,
          userId: 'system',
          messageType: 'outgoing',
          contentLength: text.length,
          processingTime: duration,
          status: 'success',
        });
      } catch {}

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.incrementErrors();
      debug(
        `Message send failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );

      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        const botName = senderName || Array.from(this.clients.keys())[0];
        const botConfig = this.botConfigs.get(botName);
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'mattermost',
          llmProvider: botConfig?.llmProvider,
          channelId,
          userId: 'system',
          messageType: 'outgoing',
          contentLength: text.length,
          processingTime: duration,
          status: 'error',
          errorMessage: error.message,
        });
      } catch {}

      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error;
      }
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errType = (hivemindError as any).type;
      if (errType === 'network' || errType === 'api') {
        throw hivemindError;
      }
      throw new NetworkError(
        error.message || 'Mattermost API Network Error',
        { status: 500 },
        { url: 'mattermost_api' }
      );
    }
  }

  public async getMessagesFromChannel(channelId: string, limit = 10): Promise<IMessage[]> {
    return this.fetchMessages(channelId, limit);
  }

  public async fetchMessages(
    channelId: string,
    limit: number = 10,
    botName?: string
  ): Promise<IMessage[]> {
    debug('Entering fetchMessages (delegated)', { channelId, limit, botName });

    const startTime = Date.now();
    let attemptCount = 0;

    const maxRetries = 3;
    const baseDelay = 1000;
    const maxDelay = 5000;

    let result: IMessage[] = [];
    let lastError: any = null;

    try {
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        attemptCount = attempt;
        debug(`Attempting to fetch messages (attempt ${attempt})`);

        try {
          const targetBot = botName || Array.from(this.clients.keys())[0];
          const client = this.clients.get(targetBot);

          if (!client) {
            debug(`Bot ${targetBot} not found`);
            return [];
          }

          const posts = await client.getChannelPosts(channelId, 0, limit);
          const messages: IMessage[] = [];

          const botConfig = this.botConfigs.get(targetBot) || {};
          const botUsername = botConfig.username;
          const botUserId = botConfig.userId;

          const { MattermostMessage } = await import('./MattermostMessage');
          const messagePromises = posts.slice(0, limit).map(async (post) => {
            let user;
            try {
              user = await client.getUser(post.user_id);
            } catch (err: any) {
              debug(`Failed to fetch user ${post.user_id}: ${err.message}`);
            }

            const username = user
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                user.username ||
                'Unknown'
              : 'Unknown';
            const isBot = Boolean(user?.is_bot);

            return new MattermostMessage(post, username, {
              isBot,
              botUsername,
              botUserId,
            });
          });

          messages.push(...(await Promise.all(messagePromises)));

          result = messages.reverse();
          break; // Success
        } catch (error: any) {
          lastError = error;
          debug(`Fetch messages attempt ${attempt} failed: ${error.message}`);

          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            throw new ValidationError(error.message, 'channelId', channelId);
          }

          const hivemindError = ErrorUtils.toHivemindError(error);
          const errType = (hivemindError as any).type;

          if (error.status === 403 || error.status === 404 || error.status === 400) {
            throw new ValidationError(
              error.message || 'Mattermost API Validation Error',
              'channelId',
              channelId
            );
          }

          const isRetryable =
            errType === 'network' ||
            errType === 'api' ||
            error.status === 500 ||
            error.status === 502 ||
            error.status === 503 ||
            error.status === 504 ||
            error.status === 429;

          if (isRetryable && attempt <= maxRetries) {
            const delay = Math.min(
              maxDelay,
              baseDelay * Math.pow(2, attempt - 1) + Math.random() * baseDelay
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (isRetryable) {
            throw new NetworkError(
              error.message || 'Mattermost API Network Error',
              { status: error.status },
              { url: 'mattermost_api' }
            );
          }

          throw hivemindError;
        }
      }

      const duration = Date.now() - startTime;
      metrics.recordResponseTime(duration);
      debug(`Messages fetched successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.incrementErrors();
      debug(
        `Message fetch failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );
      return [];
    }
  }

  /**
   * Sends a public announcement message to a specific channel via all configured Mattermost bots.
   *
   * @param channelId The ID of the channel to send the announcement to.
   * @param announcement The announcement payload or string message.
   * @returns A Promise that resolves when the announcement process completes.
   */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text =
      typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';

    for (const [botName, client] of this.clients) {
      try {
        await client.postMessage({
          channel: channelId,
          text: text,
        });
        debug(`[${botName}] Sent announcement to channel ${channelId}`);
      } catch (error) {
        debug(`[${botName}] Failed to send announcement:`, error);
      }
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    debug(`Joining Mattermost channel: ${channel}`);
  }

  public getClientId(): string {
    const firstBot = Array.from(this.clients.keys())[0];
    const client = this.clients.get(firstBot);
    const botConfig = this.botConfigs.get(firstBot);
    return client?.getCurrentUserId?.() || botConfig?.userId || firstBot || 'mattermost-bot';
  }

  public getAgentStartupSummaries() {
    const safePrompt = (cfg: any): string => {
      const p =
        cfg?.OPENAI_SYSTEM_PROMPT ??
        cfg?.openai?.systemPrompt ??
        cfg?.SYSTEM_INSTRUCTION ??
        cfg?.systemInstruction ??
        cfg?.llm?.systemPrompt ??
        '';
      return typeof p === 'string' ? p : String(p || '');
    };

    const safeLlm = (
      cfg: any
    ): { llmProvider?: string; llmModel?: string; llmEndpoint?: string } => {
      const llmProvider = cfg?.LLM_PROVIDER ?? cfg?.llmProvider ?? cfg?.llm?.provider ?? undefined;

      const llmModel = cfg?.OPENAI_MODEL ?? cfg?.openai?.model ?? cfg?.llm?.model ?? undefined;

      const llmEndpoint =
        cfg?.OPENAI_BASE_URL ??
        cfg?.openai?.baseUrl ??
        cfg?.openwebui?.apiUrl ??
        cfg?.OPENSWARM_BASE_URL ??
        cfg?.openswarm?.baseUrl ??
        undefined;

      return {
        llmProvider: llmProvider ? String(llmProvider) : undefined,
        llmModel: llmModel ? String(llmModel) : undefined,
        llmEndpoint: llmEndpoint ? String(llmEndpoint) : undefined,
      };
    };

    const names = Array.from(this.clients.keys());
    return names.map((name) => {
      const cfg = this.botConfigs.get(name) || {};
      const { llmProvider, llmModel, llmEndpoint } = safeLlm(cfg);
      return {
        name: String(name),
        provider: 'mattermost',
        botId: String(cfg?.userId || name),
        messageProvider: 'mattermost',
        llmProvider,
        llmModel,
        llmEndpoint,
        systemPrompt: safePrompt(cfg),
      };
    });
  }

  public resolveAgentContext(params: { botConfig: any; agentDisplayName: string }) {
    try {
      const botConfig = params?.botConfig || {};
      const agentDisplayName = String(params?.agentDisplayName || '').trim();
      const agentInstanceName = String(botConfig?.name || '').trim();

      const senderKey = agentInstanceName || agentDisplayName;
      const client = this.clients.get(senderKey);
      const botId = client?.getCurrentUserId?.() || botConfig?.userId || senderKey;
      const botUsername = client?.getCurrentUsername?.() || botConfig?.username;
      const nameCandidates = Array.from(
        new Set([agentDisplayName, agentInstanceName, botUsername].filter(Boolean))
      );

      return { botId, senderKey, nameCandidates };
    } catch {
      return null;
    }
  }

  public getDefaultChannel(): string {
    const firstBot = Array.from(this.channels.keys())[0];
    return this.channels.get(firstBot) || 'town-square';
  }

  public async getChannelTopic(channelId: string): Promise<string | null> {
    try {
      const firstBot = Array.from(this.clients.keys())[0];
      const client = this.clients.get(firstBot);
      if (!client) {
        return null;
      }

      const channel = await client.getChannelInfo(channelId);
      return channel?.purpose || channel?.header || null;
    } catch {
      return null;
    }
  }

  public async sendTyping(
    channelId: string,
    senderName?: string,
    threadId?: string
  ): Promise<void> {
    try {
      const botName = senderName || Array.from(this.clients.keys())[0];
      const client = this.clients.get(botName);
      if (!client) {
        return;
      }
      await client.sendTyping(channelId, threadId);
    } catch (error: unknown) {
      // Typing indicators are best-effort; surface the failure via debug
      // logging rather than swallowing it silently so issues are diagnosable.
      debug('sendTyping failed: %s', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Surfaces the active LLM model as the bot's Mattermost custom status
   * (the short text + emoji shown next to the user).
   *
   * Opt-in: set `MATTERMOST_ENABLE_STATUS_UPDATES=true` to enable. This is
   * gated because updating a bot's custom status requires the token to be a
   * full user/bot account with status scope, which not every deployment has;
   * leaving it off keeps the previous no-op behavior.
   *
   * Best-effort and self-deduplicating: repeated calls with the same modelId
   * for the same bot make no API call, and any API failure is swallowed (the
   * underlying client logs it at debug level) so model selection never breaks
   * message handling.
   */
  public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
    if (process.env.MATTERMOST_ENABLE_STATUS_UPDATES !== 'true') {
      return;
    }
    if (!modelId) {
      return;
    }

    const botName = senderKey || Array.from(this.clients.keys())[0];
    if (!botName) {
      return;
    }

    if (this.lastModelActivity.get(botName) === modelId) {
      return;
    }

    const client = this.clients.get(botName);
    if (!client || typeof client.setCustomStatus !== 'function') {
      return;
    }

    try {
      await client.setCustomStatus(`Model: ${modelId}`);
      this.lastModelActivity.set(botName, modelId);
      debug(`[${botName}] Set Mattermost custom status: Model: ${modelId}`);
    } catch (error) {
      debug(`Mattermost setModelActivity failed for ${botName}:`, error);
    }
  }

  public async shutdown(): Promise<void> {
    debug('Shutting down MattermostService...');
    for (const client of this.clients.values()) {
      try {
        client.disconnect?.();
      } catch {
        /* ignore */
      }
    }
    this.subscribedBots.clear();
    this.lastModelActivity.clear();
    this.messageHandler = undefined;
    MattermostService.instance = undefined;
  }

  public scoreChannel(channelId: string): number {
    try {
      const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
      if (!enabled) {
        return 0;
      }
      return channelComputeScore(channelId);
    } catch {
      return 0;
    }
  }

  public getBotNames(): string[] {
    return Array.from(this.clients.keys());
  }

  public getBotConfig(botName: string): any {
    return this.botConfigs.get(botName);
  }

  public async getChannelOwnerId(channelId: string): Promise<string> {
    try {
      const firstBot = Array.from(this.clients.keys())[0];
      const client = this.clients.get(firstBot);
      if (!client) {
        return '';
      }

      const channel = await client.getChannelInfo(channelId);
      if (!channel) {
        return '';
      }

      // Mattermost channels don't have a single "owner" like Discord, but the
      // API exposes the user that created the channel via `creator_id`. Use it
      // as the closest equivalent (empty for DMs/system-created channels).
      return channel.creator_id || '';
    } catch (error) {
      debug(`Failed to get channel owner for ${channelId}:`, error);
      return '';
    }
  }

  public async getChannels(
    botName?: string
  ): Promise<Array<{ id: string; name: string; type?: string }>> {
    const targetBot = botName || Array.from(this.clients.keys())[0];
    const client = this.clients.get(targetBot);

    if (!client) {
      return [];
    }

    try {
      // Fetch public and private channels
      const channels = await client.getChannels();
      return (channels || []).map((c: any) => ({
        id: c.id,
        name: c.display_name || c.name || c.id,
        type: c.type === 'O' ? 'public' : c.type === 'P' ? 'private' : 'channel',
      }));
    } catch (error) {
      debug(`Failed to fetch Mattermost channels for ${botName}: ${error}`);
      return [];
    }
  }

  public getDelegatedServices(): Array<{
    serviceName: string;
    messengerService: IMessengerService;
    botConfig: any;
  }> {
    return Array.from(this.clients.keys()).map((name) => {
      const cfg = this.botConfigs.get(name) || {};
      const serviceName = `mattermost-${name}`;

      const serviceWrapper: IMessengerService = {
        initialize: async () => {
          /* managed by parent */
        },
        shutdown: async () => {
          /* managed by parent */
        },

        sendMessageToChannel: async (
          channelId: string,
          message: string,
          senderName?: string,
          threadId?: string,
          replyToMessageId?: string
        ) => {
          return this.sendMessageToChannel(channelId, message, name, threadId, replyToMessageId);
        },

        getMessagesFromChannel: async (channelId: string) => this.getMessagesFromChannel(channelId),

        sendPublicAnnouncement: async (channelId: string, announcement: any) =>
          this.sendPublicAnnouncement(channelId, announcement),

        getChannelTopic: async (channelId: string) => this.getChannelTopic(channelId),

        getClientId: () => {
          const client = this.clients.get(name);
          return client?.getCurrentUserId?.() || cfg.userId || name;
        },

        getDefaultChannel: () => cfg.channel || 'town-square',

        setMessageHandler: () => {
          /* global handler managed by parent */
        },

        setModelActivity: async (modelId: string, senderKey?: string) =>
          this.setModelActivity(modelId, senderKey || name),

        sendTyping: async (channelId: string, senderName?: string, threadId?: string) =>
          this.sendTyping(channelId, senderName || name, threadId),

        getChannels: async (botName?: string) => this.getChannels(botName || name),

        supportsChannelPrioritization: this.supportsChannelPrioritization,
        scoreChannel: this.scoreChannel ? (cid) => this.scoreChannel!(cid) : undefined,
      };

      return {
        serviceName,
        messengerService: serviceWrapper,
        botConfig: cfg,
      };
    });
  }
}

export default MattermostService;
