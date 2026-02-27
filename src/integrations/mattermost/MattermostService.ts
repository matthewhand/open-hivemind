import { EventEmitter } from 'events';
import type { Application } from 'express';
import retry from 'async-retry';
import Debug from 'debug';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
// Routing (feature-flagged parity)
import messageConfig from '@config/messageConfig';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import {
  ApiError,
  BaseHivemindError,
  ConfigurationError,
  NetworkError,
  ValidationError,
} from '@src/types/errorClasses';
import { ErrorUtils } from '@src/types/errors';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';
import MattermostClient from './mattermostClient';

const debug = Debug('app:MattermostService:verbose');

// Metrics and retry configuration
const metrics = MetricsCollector.getInstance();
const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
};

/**
 * MattermostService implementation supporting multi-instance configuration
 * Uses BotConfigurationManager for consistent multi-bot support across platforms
 * Includes retry logic, metrics emission, WebSocket telemetry, and health monitoring
 */
export class MattermostService extends EventEmitter implements IMessengerService {
  private static instance: MattermostService | undefined;
  private clients: Map<string, MattermostClient> = new Map();
  private channels: Map<string, string> = new Map();
  private botConfigs: Map<string, any> = new Map();
  private app?: Application;

  // Health tracking
  private lastHealthCheck: Map<string, Date> = new Map();
  private healthStatus: Map<string, 'healthy' | 'degraded' | 'unhealthy'> = new Map();
  private connectionErrors: Map<string, number> = new Map();
  private lastActivity: Map<string, Date> = new Map();

  // Channel prioritization support hook (delegation gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    super();
    debug('Initializing MattermostService with multi-instance support');
    this.initializeFromConfiguration();
  }

  /**
   * Initialize MattermostService from BotConfigurationManager
   * Supports multiple Mattermost bot instances with BOTS_* environment variables
   */
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

  /**
   * Initialize a single Mattermost bot instance
   */
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

    // Initialize health tracking
    this.healthStatus.set(botName, 'healthy');
    this.connectionErrors.set(botName, 0);
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
        // Cache identity for mention detection / self-filtering.
        const botConfig = this.botConfigs.get(botName) || {};
        this.botConfigs.set(botName, {
          ...botConfig,
          userId: client.getCurrentUserId?.() || botConfig.userId,
          username: client.getCurrentUsername?.() || botConfig.username,
        });

        // Update health status after successful connection
        this.healthStatus.set(botName, 'healthy');
        this.connectionErrors.set(botName, 0);
        this.lastHealthCheck.set(botName, new Date());
      } catch (error) {
        debug(`Failed to connect to Mattermost for bot ${botName}:`, error);
        this.healthStatus.set(botName, 'unhealthy');
        this.connectionErrors.set(botName, (this.connectionErrors.get(botName) || 0) + 1);
        throw error;
      }
    }

    const startupGreetingService = require('../../services/StartupGreetingService').default;
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
    const botName = senderName || Array.from(this.clients.keys())[0];

    try {
      const result = await retry(async (bail, attempt) => {
        attemptCount = attempt;
        debug(`Attempting to send message (attempt ${attempt})`);

        try {
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

          // Don't retry on certain errors
          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            const bailError = new ValidationError(error.message, 'channelId', channelId);
            bail(bailError);
            return '';
          }

          // Convert error to appropriate Hivemind error type
          const hivemindError = ErrorUtils.toHivemindError(error);
          if (hivemindError.type === 'network' || hivemindError.type === 'api') {
            throw hivemindError;
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      metrics.incrementMessages();
      metrics.recordResponseTime(duration);

      // Update activity tracking
      this.lastActivity.set(botName, new Date());
      this.healthStatus.set(botName, 'healthy');

      // Record WebSocket monitoring event for successful message
      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'mattermost',
          channelId,
          userId: 'system',
          messageType: 'outgoing',
          contentLength: text.length,
          processingTime: duration,
          status: 'success',
        });
      } catch {}

      debug(`Message sent successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.incrementErrors();

      // Update connection error tracking
      this.connectionErrors.set(botName, (this.connectionErrors.get(botName) || 0) + 1);

      // Determine health status based on error count
      const errorCount = this.connectionErrors.get(botName) || 0;
      if (errorCount >= 5) {
        this.healthStatus.set(botName, 'unhealthy');
      } else if (errorCount >= 1) {
        this.healthStatus.set(botName, 'degraded');
      }

      debug(
        `Message send failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );

      // Record WebSocket monitoring event for failed message
      try {
        const ws = require('@src/server/services/WebSocketService')
          .default as typeof import('@src/server/services/WebSocketService').default;
        ws.getInstance().recordMessageFlow({
          botName,
          provider: 'mattermost',
          channelId,
          userId: 'system',
          messageType: 'outgoing',
          contentLength: text.length,
          status: 'error',
          errorMessage: error.message,
        });
      } catch {}

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
    const targetBot = botName || Array.from(this.clients.keys())[0];

    try {
      const result = await retry(async (bail, attempt) => {
        attemptCount = attempt;
        debug(`Attempting to fetch messages (attempt ${attempt})`);

        try {
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

          return messages.reverse(); // Most recent first
        } catch (error: any) {
          debug(`Fetch messages attempt ${attempt} failed: ${error.message}`);

          // Don't retry on certain errors
          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            const bailError = new ValidationError(error.message, 'channelId', channelId);
            bail(bailError);
            return [];
          }

          // Convert error to appropriate Hivemind error type
          const hivemindError = ErrorUtils.toHivemindError(error);
          if (hivemindError.type === 'network' || hivemindError.type === 'api') {
            throw hivemindError;
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      metrics.recordResponseTime(duration);

      // Update activity tracking
      this.lastActivity.set(targetBot, new Date());

      debug(`Messages fetched successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.incrementErrors();

      // Update connection error tracking
      this.connectionErrors.set(targetBot, (this.connectionErrors.get(targetBot) || 0) + 1);

      debug(
        `Message fetch failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );
      return []; // Return empty array on failure
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

      // MattermostService selects bot instances by their configured bot name key.
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

  /**
   * Best-effort channel topic lookup (purpose/header).
   */
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

  /**
   * Best-effort typing indicator (server dependent).
   */
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
    } catch {}
  }

  /**
   * Mattermost does not expose a reliable "activity status" for bot tokens across all servers.
   * This is currently a no-op to avoid noisy failures.
   */
  public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
    void modelId;
    void senderKey;
    return;
  }

  public async shutdown(): Promise<void> {
    debug('Shutting down MattermostService...');

    // Clear health tracking maps
    this.lastHealthCheck.clear();
    this.healthStatus.clear();
    this.connectionErrors.clear();
    this.lastActivity.clear();

    MattermostService.instance = undefined;
  }

  /**
   * Channel scoring hook: returns 0 when MESSAGE_CHANNEL_ROUTER_ENABLED is disabled,
   * otherwise delegates to ChannelRouter.computeScore to keep parity with other providers.
   */
  public scoreChannel(channelId: string): number {
    try {
      const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
      if (!enabled) {
        return 0;
      }
      return channelComputeScore(channelId);
    } catch {
      // Be conservative: on any error, neutralize impact
      return 0;
    }
  }

  /**
   * Get all configured bot names
   */
  public getBotNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get configuration for a specific bot
   */
  public getBotConfig(botName: string): any {
    return this.botConfigs.get(botName);
  }

  /**
   * Get structured metrics for the MattermostService
   */
  public getMetrics(): any {
    const botMetrics: Record<string, any> = {};
    for (const [botName, client] of this.clients) {
      botMetrics[botName] = {
        connected: client?.isConnected?.() || false,
        healthStatus: this.healthStatus.get(botName) || 'unknown',
        connectionErrors: this.connectionErrors.get(botName) || 0,
        lastActivity: this.lastActivity.get(botName)?.toISOString() || null,
        lastHealthCheck: this.lastHealthCheck.get(botName)?.toISOString() || null,
      };
    }

    return {
      service: 'mattermost',
      botCount: this.clients.size,
      bots: botMetrics,
      globalMetrics: metrics.getMetrics(),
    };
  }

  /**
   * Perform health check for all bots
   */
  public async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    bots: Record<string, any>;
  }> {
    const botHealth: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [botName, client] of this.clients) {
      const currentStatus = this.healthStatus.get(botName) || 'unhealthy';
      const errorCount = this.connectionErrors.get(botName) || 0;
      const lastActivity = this.lastActivity.get(botName);
      const lastHealthCheck = this.lastHealthCheck.get(botName);

      // Update health check timestamp
      this.lastHealthCheck.set(botName, new Date());

      // Try to verify connection
      let connectionVerified = false;
      try {
        connectionVerified = client?.isConnected?.() || false;
      } catch {
        connectionVerified = false;
      }

      // Check if activity is stale (> 5 minutes)
      let isStale = false;
      if (lastActivity) {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        isStale = lastActivity.getTime() < fiveMinutesAgo;
      }

      botHealth[botName] = {
        status: currentStatus,
        connected: connectionVerified,
        errorCount,
        lastActivity: lastActivity?.toISOString() || null,
        lastHealthCheck: lastHealthCheck?.toISOString() || null,
        isStale,
      };

      // Update overall status
      if (currentStatus === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (currentStatus === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded';
      }
    }

    return {
      status: overallStatus,
      bots: botHealth,
    };
  }

  /**
   * Returns individual service wrappers for each managed Mattermost bot.
   */
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