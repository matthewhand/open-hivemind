import { EventEmitter } from 'events';
import retry from 'async-retry';
import Debug from 'debug';
import type { Application } from 'express';
import {
  type IBotConfigProvider,
  type IMetricsCollector,
  type IStartupGreetingEmitter,
  type IChannelScorer,
  type IErrorFactory,
  type IMessengerService,
  type IMessage,
  type MessageFlowEventData,
  ValidationError,
  getErrorFactory,
} from '@hivemind/shared-types';
import MattermostClient from './mattermostClient';

const debug = Debug('app:MattermostService:verbose');

const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
};

/**
 * Dependencies required by MattermostService.
 */
export interface MattermostServiceDependencies {
  botConfigProvider: IBotConfigProvider;
  metricsCollector: IMetricsCollector;
  greetingEmitter?: IStartupGreetingEmitter;
  channelScorer?: IChannelScorer;
  errorFactory?: IErrorFactory;
}

/**
 * Default no-op metrics collector for fallback.
 */
class NoOpMetricsCollector implements IMetricsCollector {
  incrementMessages(): void { }
  incrementErrors(): void { }
  recordResponseTime(_time: number): void { }
  recordMessageFlow(_event: MessageFlowEventData): void { }
}

/**
 * Default no-op greeting emitter for fallback.
 */
class NoOpGreetingEmitter implements IStartupGreetingEmitter {
  emitServiceReady(_service: IMessengerService): void { }
}

/**
 * Default no-op channel scorer for fallback.
 */
class NoOpChannelScorer implements IChannelScorer {
  isRouterEnabled(): boolean {
    return false;
  }
  computeScore(_channelId: string): number {
    return 0;
  }
}

export class MattermostService extends EventEmitter implements IMessengerService {
  private static instance: MattermostService | undefined;
  private clients: Map<string, MattermostClient> = new Map();
  private channels: Map<string, string> = new Map();
  private botConfigs: Map<string, any> = new Map();
  private app?: Application;
  private deps: MattermostServiceDependencies;

  public supportsChannelPrioritization: boolean = true;

  private constructor(deps?: MattermostServiceDependencies) {
    super();
    // Use provided dependencies or fallback to no-op implementations
    this.deps = {
      botConfigProvider: deps?.botConfigProvider ?? { getAllBots: () => [] },
      metricsCollector: deps?.metricsCollector ?? new NoOpMetricsCollector(),
      greetingEmitter: deps?.greetingEmitter ?? new NoOpGreetingEmitter(),
      channelScorer: deps?.channelScorer ?? new NoOpChannelScorer(),
      errorFactory: deps?.errorFactory ?? getErrorFactory(),
    };
    debug('Initializing MattermostService with multi-instance support');
    this.initializeFromConfiguration();
  }

  private initializeFromConfiguration(): void {
    const { botConfigProvider } = this.deps;
    const mattermostBotConfigs = botConfigProvider
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

  public static getInstance(deps?: MattermostServiceDependencies): MattermostService {
    if (!MattermostService.instance) {
      MattermostService.instance = new MattermostService(deps);
    } else if (deps) {
      // Update dependencies if provided to an existing instance
      this.instance.setDependencies(deps);
    }
    return MattermostService.instance;
  }

  /**
   * Reset the singleton instance. Useful for testing.
   */
  public static resetInstance(): void {
    MattermostService.instance = undefined;
  }

  /**
   * Set or update dependencies after construction.
   * Useful for lazy initialization or testing.
   */
  public setDependencies(deps: MattermostServiceDependencies): void {
    this.deps = {
      ...this.deps,
      ...deps,
    };
    // Re-initialize if botConfigProvider changed
    if (deps.botConfigProvider) {
      this.clients.clear();
      this.channels.clear();
      this.botConfigs.clear();
      this.initializeFromConfiguration();
    }
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

    this.deps.greetingEmitter?.emitServiceReady(this);
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

          // Check if it's a network/api error type
          const errType = (error as any).type;
          if (errType === 'network' || errType === 'api') {
            throw error;
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      this.deps.metricsCollector.incrementMessages();
      this.deps.metricsCollector.recordResponseTime(duration);
      debug(`Message sent successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.deps.metricsCollector.incrementErrors();
      debug(
        `Message send failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );

      throw error;
    }
  }

  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
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

          for (const post of posts.slice(0, limit)) {
            const user = await client.getUser(post.user_id);
            const username = user
              ? `${user.first_name} ${user.last_name}`.trim() || user.username
              : 'Unknown';
            const isBot = Boolean(user?.is_bot);

            const { MattermostMessage } = await import('./MattermostMessage');
            const mattermostMsg = new MattermostMessage(post, username, {
              isBot,
              botUsername,
              botUserId,
            });
            messages.push(mattermostMsg);
          }

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

          // Check if it's a network/api error type
          const errType = (error as any).type;
          if (errType === 'network' || errType === 'api') {
            throw error;
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      this.deps.metricsCollector.recordResponseTime(duration);
      debug(`Messages fetched successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.deps.metricsCollector.incrementErrors();
      debug(
        `Message fetch failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );
      return [];
    }
  }

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
      if (!this.deps.channelScorer?.isRouterEnabled()) {
        return 0;
      }
      return this.deps.channelScorer.computeScore(channelId);
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
