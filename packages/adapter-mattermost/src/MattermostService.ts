import { EventEmitter } from 'events';
import retry from 'async-retry';
import Debug from 'debug';
import type { Application } from 'express';
import { container } from 'tsyringe';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import { StartupGreetingService } from '@src/services/StartupGreetingService';
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
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';
import MattermostClient from './mattermostClient';

const debug = Debug('app:MattermostService:verbose');

const metrics = MetricsCollector.getInstance();
const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
};

export class MattermostService extends EventEmitter implements IMessengerService {
  private static instance: MattermostService | undefined;
  private clients = new Map<string, MattermostClient>();
  private channels = new Map<string, string>();
  private botConfigs = new Map<string, any>();
  private app?: Application;

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
    });
  }

  public static getInstance(): MattermostService {
    if (!MattermostService.instance) {
      MattermostService.instance = new MattermostService();
    }
    return MattermostService.instance;
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
      } catch (error) {
        debug(`Failed to connect to Mattermost for bot ${botName}:`, error);
        throw error;
      }
    }

    const startupGreetingService =
      container.resolve<StartupGreetingService>(StartupGreetingService);
    startupGreetingService.emit('service-ready', this);
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(): void {
    debug('Setting message handler for Mattermost bots');
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

    try {
      const result = await retry(async (bail, attempt) => {
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
          return post.id;
        } catch (error: any) {
          debug(`Send message attempt ${attempt} failed: ${error.message}`);

          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            const bailError = new ValidationError(error.message, 'channelId', channelId);
            bail(bailError);
            return '';
          }

          const hivemindError = ErrorUtils.toHivemindError(error);
          const errType = (hivemindError as any).type;
          if (errType === 'network' || errType === 'api') {
            throw hivemindError;
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      metrics.incrementMessages();
      metrics.recordResponseTime(duration);
      debug(`Message sent successfully after ${attemptCount} attempts in ${duration}ms`);
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
        ws.getInstance().recordMessageFlow({
          botName: senderName || Array.from(this.clients.keys())[0],
          provider: 'mattermost',
          channelId,
          userId: 'system',
          messageType: 'outgoing',
          contentLength: text.length,
          status: 'error',
          errorMessage: error.message,
        });
      } catch { }

      throw error;
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

    try {
      const result = await retry(async (bail, attempt) => {
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
            const user = await client.getUser(post.user_id);
            const username = user
              ? `${user.first_name} ${user.last_name}`.trim() || user.username
              : 'Unknown';
            const isBot = Boolean(user?.is_bot);

            return new MattermostMessage(post, username, {
              isBot,
              botUsername,
              botUserId,
            });
          });

          messages.push(...(await Promise.all(messagePromises)));

          return messages.reverse();
        } catch (error: any) {
          debug(`Fetch messages attempt ${attempt} failed: ${error.message}`);

          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            const bailError = new ValidationError(error.message, 'channelId', channelId);
            bail(bailError);
            return [];
          }

          const hivemindError = ErrorUtils.toHivemindError(error);
          const errType = (hivemindError as any).type;
          if (errType === 'network' || errType === 'api') {
            throw hivemindError;
          }

          throw error;
        }
      }, RETRY_CONFIG);

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
    } catch { }
  }

  public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
    void modelId;
    void senderKey;
    return;
  }

  public async shutdown(): Promise<void> {
    debug('Shutting down MattermostService...');
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
