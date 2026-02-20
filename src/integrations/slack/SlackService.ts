import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import retry from 'async-retry';
import Debug from 'debug';
import express, { type Application } from 'express';
import type { KnownBlock } from '@slack/web-api';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import { getLlmProvider } from '@src/llm/getLlmProvider';
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
// Routing
import messageConfig from '@config/messageConfig';
import slackConfig from '@config/slackConfig';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';
import { SlackBotFacade, type ISlackBotFacade } from './modules/ISlackBotFacade';
import { SlackEventBus, type ISlackEventBus } from './modules/ISlackEventBus';
// Module extractions
import { SlackMessageIO, type ISlackMessageIO } from './modules/ISlackMessageIO';
import { SlackBotManager } from './SlackBotManager';
import { SlackEventProcessor } from './SlackEventProcessor';
import { SlackInteractiveActions } from './SlackInteractiveActions';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import type SlackMessage from './SlackMessage';
import { SlackMessageProcessor } from './SlackMessageProcessor';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackWelcomeHandler } from './SlackWelcomeHandler';

const debug = Debug('app:SlackService:verbose');

// Metrics and retry configuration
const metrics = MetricsCollector.getInstance();
const RETRY_CONFIG = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 5000,
  factor: 2,
};

/**
 * SlackService implementation supporting multi-instance configuration
 * Uses BotConfigurationManager for consistent multi-bot support across platforms
 */
export class SlackService extends EventEmitter implements IMessengerService {
  private static instance: SlackService | undefined;
  private botManagers: Map<string, SlackBotManager> = new Map();
  private signatureVerifiers: Map<string, SlackSignatureVerifier> = new Map();
  private interactiveHandlers: Map<string, SlackInteractiveHandler> = new Map();
  private interactiveActions: Map<string, SlackInteractiveActions> = new Map();
  private eventProcessors: Map<string, SlackEventProcessor> = new Map();
  private messageProcessors: Map<string, SlackMessageProcessor> = new Map();
  private welcomeHandlers: Map<string, SlackWelcomeHandler> = new Map();
  private lastSentEventTs: Map<string, string> = new Map();
  private lastModelActivity: Map<string, string> = new Map();
  private app?: Application;
  private joinTs: Map<string, number> = new Map();
  private botConfigs: Map<string, any> = new Map();
  private messageIO: ISlackMessageIO;
  private eventBus: ISlackEventBus;
  private botFacade: ISlackBotFacade;

  // Channel prioritization support is available; actual scoring is feature-flagged
  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    super();
    debug('Entering SlackService constructor');
    this.initializeFromConfiguration();

    // Wire SlackMessageIO with accessors that avoid circular deps
    this.messageIO = new SlackMessageIO(
      (botName?: string) => this.getBotManager(botName),
      () => Array.from(this.botManagers.keys())[0],
      this.lastSentEventTs
    );

    // Event bus for route registration and handlers
    this.eventBus = new SlackEventBus();

    // Bot lifecycle facade
    this.botFacade = new SlackBotFacade();
  }

  /**
   * Initialize SlackService from BotConfigurationManager
   * Supports multiple Slack bot instances with BOTS_* environment variables
   */
  private initializeFromConfiguration(): void {
    const configManager = BotConfigurationManager.getInstance();
    const slackBotConfigs = configManager
      .getAllBots()
      .filter((bot) => bot.messageProvider === 'slack' && bot.slack?.botToken);

    if (slackBotConfigs.length === 0) {
      debug('No Slack bot configurations found, checking legacy configuration...');
      this.initializeLegacyConfiguration();
      return;
    }

    debug(`Initializing ${slackBotConfigs.length} Slack bot instances`);

    for (const botConfig of slackBotConfigs) {
      this.initializeBotInstance(botConfig);
    }
  }

  /**
   * Initialize a single Slack bot instance
   */
  private initializeBotInstance(botConfig: any): void {
    const botName = botConfig.name;
    debug(`Initializing Slack bot: ${botName}`);

    const instance = {
      token: botConfig.slack.botToken,
      signingSecret: botConfig.slack.signingSecret || '',
      name: botName,
      appToken: botConfig.slack.appToken,
      defaultChannel: botConfig.slack.defaultChannelId,
      joinChannels: botConfig.slack.joinChannels,
      mode: botConfig.slack.mode || 'socket',
    };

    const botManager = new SlackBotManager([instance], instance.mode);
    const signatureVerifier = new SlackSignatureVerifier(instance.signingSecret);
    const interactiveActions = new SlackInteractiveActions(this);

    const interactiveHandlers = {
      sendCourseInfo: async (channel: string) => interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel: string) =>
        interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel: string) => interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId: string) =>
        interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel: string, userId: string) =>
        interactiveActions.sendInteractiveHelpMessage(channel, userId),
      handleButtonClick: async (channel: string, userId: string, actionId: string) => {
        const welcomeHandler = new SlackWelcomeHandler(botManager);
        return welcomeHandler.handleButtonClick(channel, userId, actionId);
      },
    };

    const interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
    const eventProcessor = new SlackEventProcessor(this);
    const messageProcessor = new SlackMessageProcessor(botManager);
    const welcomeHandler = new SlackWelcomeHandler(botManager);

    this.botManagers.set(botName, botManager);
    this.signatureVerifiers.set(botName, signatureVerifier);
    this.interactiveHandlers.set(botName, interactiveHandler);
    this.interactiveActions.set(botName, interactiveActions);
    this.eventProcessors.set(botName, eventProcessor);
    this.messageProcessors.set(botName, messageProcessor);
    this.welcomeHandlers.set(botName, welcomeHandler);
    this.botConfigs.set(botName, instance);
    this.joinTs.set(botName, Date.now() / 1000);
    this.lastSentEventTs.set(botName, '');
  }

  /**
   * Public: Add a bot at runtime (demo flow). Initializes instance and registers routes/handlers.
   */
  public async addBot(botConfig: any): Promise<void> {
    const botName = botConfig.name;
    this.initializeBotInstance(botConfig);
    if (!this.app) {
      throw new ConfigurationError('Express app not configured', 'SLACK_APP_NOT_CONFIGURED');
    }
    // Register routes and start bot
    const signatureVerifier = this.signatureVerifiers.get(botName)!;
    const eventProcessor = this.eventProcessors.get(botName)!;
    const interactiveHandler = this.interactiveHandlers.get(botName)!;
    this.eventBus.registerBotRoutes(
      this.app,
      botName,
      signatureVerifier,
      eventProcessor,
      interactiveHandler
    );

    const botManager = this.botManagers.get(botName)!;
    const welcomeHandler = this.welcomeHandlers.get(botName);
    await this.botFacade.initialize(botName, botManager);
    this.joinTs.set(botName, Date.now() / 1000);
    await this.botFacade.joinConfiguredChannels(botName, botManager, welcomeHandler);
    await this.eventProcessors.get(botName)?.debugEventPermissions();
  }

  /**
   * Initialize legacy configuration for backward compatibility
   */
  private initializeLegacyConfiguration(): void {
    let instances: Array<{
      token: string;
      signingSecret: string;
      name: string;
      appToken?: string;
      defaultChannelId?: string;
      joinChannels?: string;
    }> = [];
    let mode: 'socket' | 'rtm' = 'socket';

    // Legacy configuration loading (similar to original implementation)
    try {
      const configDir = process.env.NODE_CONFIG_DIR || 'config';
      const messengersConfigPath = path.join(configDir, 'messengers.json');

      if (fs.existsSync(messengersConfigPath)) {
        const messengersConfig = JSON.parse(fs.readFileSync(messengersConfigPath, 'utf-8'));
        instances = messengersConfig.slack?.instances || [];
        mode = messengersConfig.slack?.mode || 'socket';
      }

      if (instances.length > 0) {
        debug(`Initializing ${instances.length} legacy Slack instances`);

        instances.forEach((instance, index) => {
          const botName = instance.name || `LegacyBot${index + 1}`;
          const legacyConfig = {
            name: botName,
            slack: {
              botToken: instance.token,
              signingSecret: instance.signingSecret,
              appToken: instance.appToken,
              defaultChannelId: instance.defaultChannelId,
              joinChannels: instance.joinChannels,
              mode,
            },
          };
          this.initializeBotInstance(legacyConfig);
        });
      }
      // Fallback to environment variables for single-bot legacy setup
      if (instances.length === 0 && process.env.SLACK_BOT_TOKEN) {
        instances = [
          {
            token: String(process.env.SLACK_BOT_TOKEN),
            signingSecret: String(process.env.SLACK_SIGNING_SECRET || ''),
            name: process.env.MESSAGE_USERNAME_OVERRIDE || 'SlackBot',
            appToken: process.env.SLACK_APP_TOKEN,
            defaultChannelId: process.env.SLACK_DEFAULT_CHANNEL_ID,
            joinChannels: process.env.SLACK_JOIN_CHANNELS,
          },
        ];
      }

      if (instances.length > 0) {
        instances.forEach((instance, index) => {
          const botName = instance.name || `LegacyEnvBot${index + 1}`;
          const legacyConfig = {
            name: botName,
            slack: {
              botToken: instance.token,
              signingSecret: instance.signingSecret,
              appToken: instance.appToken,
              defaultChannelId: instance.defaultChannelId,
              joinChannels: instance.joinChannels,
              mode,
            },
          };
          this.initializeBotInstance(legacyConfig);
        });
      }

      // Do not throw an error if no legacy config is found, as this might be intentional.
      // The service will just have no bots.
    } catch (error: unknown) {
      if (error instanceof BaseHivemindError) {
        debug(`Legacy configuration loading failed: ${error.message}`);
        console.error('Slack legacy configuration loading error:', error);
      } else {
        const configError = new ConfigurationError(
          `Failed to load legacy configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SLACK_LEGACY_CONFIG_ERROR'
        );
        debug(`Legacy configuration loading failed: ${configError.message}`);
        console.error('Slack legacy configuration loading error:', configError);
      }

      // Do not re-throw, allow service to initialize without legacy bots if file is malformed.
    }
  }

  public static getInstance(): SlackService {
    debug('Entering getInstance');
    if (!SlackService.instance) {
      try {
        debug('Creating new SlackService instance');
        SlackService.instance = new SlackService();
      } catch (error: unknown) {
        debug('Failed to create SlackService instance:', error);
        console.error('Slack service instance creation error:', error);

        if (error instanceof BaseHivemindError) {
          throw error;
        }

        throw new ConfigurationError(
          `Failed to create SlackService instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SLACK_SERVICE_INIT_ERROR',
          undefined,
          undefined,
          { originalError: error }
        );
      }
    }
    debug('Returning SlackService instance');
    return SlackService.instance;
  }

  public async initialize(): Promise<void> {
    debug('Entering initialize');
    if (!this.app) {
      debug('Express app not set; call setApp() before initialize()');
      throw ErrorUtils.createError(
        'Express app not configured',
        'configuration' as any,
        'SLACK_APP_NOT_CONFIGURED_INIT',
        500
      );
    }

    debug(`Initializing ${this.botManagers.size} Slack bot managers...`);

    for (const [botName, botManager] of this.botManagers) {
      debug(`Registering routes for bot: ${botName}`);

      // Use event bus to register routes/handlers
      const signatureVerifier = this.signatureVerifiers.get(botName)!;
      const eventProcessor = this.eventProcessors.get(botName)!;
      const interactiveHandler = this.interactiveHandlers.get(botName)!;

      // Keep original urlencoded middleware where needed
      this.app.post(`/slack/${botName}/action-endpoint`, express.urlencoded({ extended: true }));
      this.app.post(
        `/slack/${botName}/interactive-endpoint`,
        express.urlencoded({ extended: true })
      );

      this.eventBus.registerBotRoutes(
        this.app,
        botName,
        signatureVerifier,
        eventProcessor,
        interactiveHandler
      );

      try {
        // Initialize bot via facade
        await this.botFacade.initialize(botName, botManager);
        this.joinTs.set(botName, Date.now() / 1000);
        debug(
          `Bot manager ${botName} initialized successfully, joinTs: ${this.joinTs.get(botName)}`
        );

        // Join configured channels via facade
        const welcomeHandler = this.welcomeHandlers.get(botName);
        await this.botFacade.joinConfiguredChannels(botName, botManager, welcomeHandler);

        const processor = this.eventProcessors.get(botName);
        if (processor) {
          await processor.debugEventPermissions();
        }
      } catch (error) {
        debug(`Initialization failed for ${botName}: ${error}`);
        throw new Error(`Failed to initialize SlackService for ${botName}: ${error}`);
      }
    }

    console.log('!!! EMITTING service-ready FOR SlackService !!!');
    console.log('!!! SlackService EMITTER INSTANCE:', this);
    const startupGreetingService = require('@src/services/StartupGreetingService').default;
    startupGreetingService.emit('service-ready', this);
  }

  public setApp(app: Application): void {
    debug('Entering setApp', { appProvided: !!app });
    if (!app) {
      debug('Error: No app provided');
      throw new Error('Application instance required');
    }
    this.app = app;
  }

  public setMessageHandler(
    handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>
  ): void {
    debug('Entering setMessageHandler');
    if (typeof handler !== 'function') {
      debug('Error: Invalid message handler provided');
      throw new Error('Message handler must be a function');
    }

    for (const [botName, botManager] of this.botManagers) {
      const messageProcessor = this.messageProcessors.get(botName);
      if (!messageProcessor) {
        continue;
      }

      botManager.setMessageHandler(async (message, _history, _botConfig) => {
        // Emit WebSocket monitoring event for incoming message
        try {
          const ws = require('@src/server/services/WebSocketService')
            .default as typeof import('@src/server/services/WebSocketService').default;
          ws.getInstance().recordMessageFlow({
            botName,
            provider: 'slack',
            channelId: message.getChannelId?.() || '',
            userId: message.getAuthorId?.() || '',
            messageType: 'incoming',
            contentLength: (message.getText?.() || '').length,
            status: 'success',
          });
        } catch {}
        debug(
          `[${botName}] Received message: text="${message.getText()}", event_ts=${message.data.event_ts}, thread_ts=${message.data.thread_ts}, channel=${message.getChannelId()}`
        );

        const messageTs = parseFloat(message.data.ts || '0');
        const joinTs = this.joinTs.get(botName) || 0;

        if (messageTs < joinTs) {
          debug(`[${botName}] Ignoring old message: ts=${messageTs}, joinTs=${joinTs}`);
          return '';
        }

        if (!message.getText()?.trim()) {
          debug(`[${botName}] Empty message text detected, skipping response`);
          return '';
        }

        const eventProcessor = this.eventProcessors.get(botName);
        if (eventProcessor && eventProcessor.hasDeletedMessage(message.data.ts)) {
          debug(`[${botName}] Ignoring deleted message: ts=${message.data.ts}`);
          return '';
        }

        const eventTs = message.data.event_ts;
        const lastSent = this.lastSentEventTs.get(botName);
        if (lastSent === eventTs) {
          debug(`[${botName}] Duplicate event_ts detected: ${eventTs}, skipping`);
          return '';
        }

        const threadTs = message.data.thread_ts || message.data.ts;
        try {
          const enrichedMessage: SlackMessage = await messageProcessor.enrichSlackMessage(
            message as unknown as SlackMessage
          );
          const channelId = enrichedMessage.getChannelId();

          // Fetch last 10 messages from the channel
          const historyMessages = await this.fetchMessages(channelId, 10, botName);
          debug(
            `[${botName}] Fetched ${historyMessages.length} history messages for channel ${channelId}`
          );

          const payload = await messageProcessor.constructPayload(enrichedMessage, historyMessages);
          const userMessage = payload.messages[payload.messages.length - 1].content;
          // historyMessages are already SlackMessage instances implementing IMessage in Slack domain.
          // Cast to IMessage[] to satisfy typing for LLM provider history input.
          const formattedHistory: IMessage[] = historyMessages as unknown as IMessage[];
          const metadataWithMessages = { ...payload.metadata, messages: payload.messages };
          const llmProviders = await getLlmProvider();

          if (!llmProviders.length) {
            debug(`[${botName}] No LLM providers available`);
            return "Sorry, I'm having trouble processing your request right now.";
          }

          let llmResponse: string | null = null;
          for (const provider of llmProviders) {
            try {
              llmResponse = await provider.generateChatCompletion(
                userMessage,
                formattedHistory,
                metadataWithMessages
              );
              if (llmResponse) {
                debug(`[${botName}] LLM response from ${provider.constructor.name}`);
                break; // Exit loop on success
              }
            } catch (error) {
              debug(`[${botName}] LLM provider ${provider.constructor.name} failed: ${error}`);
              // Try the next provider
            }
          }

          if (!llmResponse) {
            debug(`[${botName}] All LLM providers failed.`);
            return 'Sorry, I am currently unable to process your request. Please try again later.';
          }
          debug(`[${botName}] LLM Response:`, llmResponse);

          const { text: fallbackText, blocks } =
            await messageProcessor.processResponse(llmResponse);
          debug(
            `[${botName}] Sending response to channel ${channelId} with thread_ts: ${threadTs}`
          );

          const sentTs = await this.sendMessageToChannel(
            channelId,
            fallbackText,
            botName,
            threadTs,
            undefined, // replyToMessageId
            blocks
          );

          if (sentTs) {
            this.lastSentEventTs.set(botName, eventTs);
            debug(
              `[${botName}] Response sent successfully, lastSentEventTs updated to: ${eventTs}`
            );
          }

          return fallbackText;
        } catch (error) {
          debug(`[${botName}] Error processing message: ${error}`);
          return 'Oops, something went wrong. Please try again later.';
        }
      });
    }
  }

  public async sendMessageToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    threadId?: string,
    replyToMessageId?: string,
    blocks?: KnownBlock[]
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
          const result = await this.messageIO.sendMessageToChannel(
            channelId,
            text,
            senderName,
            threadId,
            replyToMessageId,
            blocks
          );
          metrics.incrementMessages();
          return result;
        } catch (error: any) {
          debug(`Send message attempt ${attempt} failed: ${error.message}`);

          // Don't retry on certain errors
          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            bail(error);
            return '';
          }

          throw error;
        }
      }, RETRY_CONFIG);

      const duration = Date.now() - startTime;
      metrics.recordResponseTime(duration);
      debug(`Message sent successfully after ${attemptCount} attempts in ${duration}ms`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.incrementErrors();
      debug(
        `Message send failed after ${attemptCount} attempts in ${duration}ms: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Triggers a typing indicator in the channel (RTM-only).
   * Slack does not support typing indicators over the Web API or Socket Mode.
   */
  public async sendTyping(
    channelId: string,
    senderName?: string,
    threadId?: string
  ): Promise<void> {
    try {
      const botName = senderName || Array.from(this.botManagers.keys())[0];
      const botManager = this.getBotManager(botName);
      const botInfo = botManager?.getAllBots?.()[0];

      // RTM client supports sendTyping; Socket Mode does not.
      if (botInfo?.rtmClient && typeof botInfo.rtmClient.sendTyping === 'function') {
        await botInfo.rtmClient.sendTyping(channelId);
        return;
      }

      // Default to fake typing when RTM isn't available (Socket Mode/Web API).
      if (process.env.SLACK_FAKE_TYPING === 'false') {
        debug(`sendTyping skipped (fake typing disabled). bot=${botName} channel=${channelId}`);
        return;
      }

      const messageIO = this.messageIO as any;
      if (typeof messageIO?.sendTypingPlaceholder === 'function') {
        await messageIO.sendTypingPlaceholder(channelId, botName, threadId);
      }
    } catch (error) {
      debug(`sendTyping failed for Slack channel ${channelId}: ${error}`);
    }
  }

  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    debug('Entering getMessagesFromChannel', { channelId });
    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }

    // Default to first bot for backward compatibility
    const firstBot = Array.from(this.botManagers.keys())[0];
    return this.fetchMessages(channelId, limit, firstBot);
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
          const result = await this.messageIO.fetchMessages(channelId, limit, botName);
          return result;
        } catch (error: any) {
          debug(`Fetch messages attempt ${attempt} failed: ${error.message}`);

          // Don't retry on certain errors
          if (
            error.message?.includes('channel_not_found') ||
            error.message?.includes('not_in_channel') ||
            error.message?.includes('missing_scope')
          ) {
            bail(error);
            return [];
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
      return []; // Return empty array on failure
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    debug('Entering sendPublicAnnouncement', {
      channelId,
      announcement: typeof announcement === 'string' ? announcement : 'object',
    });

    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }

    const text =
      typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';

    // Default to first bot for backward compatibility
    const firstBot = Array.from(this.botManagers.keys())[0];
    const botManager = this.botManagers.get(firstBot);

    if (botManager) {
      const bots = botManager.getAllBots();
      const botInfo = bots[0];
      await this.sendMessageToChannel(channelId, text, botInfo.botUserName);
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    debug('Entering joinChannel', { channel });
    if (!channel) {
      debug('Error: No channel provided');
      throw new Error('Channel ID required');
    }

    // Default to first bot for backward compatibility
    const firstBot = Array.from(this.botManagers.keys())[0];
    const botManager = this.botManagers.get(firstBot);

    if (botManager) {
      const bots = botManager.getAllBots();
      const botInfo = bots[0];

      try {
        await botInfo.webClient.conversations.join({ channel });
        const welcomeHandler = this.welcomeHandlers.get(firstBot);
        if (welcomeHandler) {
          await welcomeHandler.sendBotWelcomeMessage(channel);
        }
        debug(`Successfully joined and welcomed channel: ${channel}`);
      } catch (error) {
        debug(`Failed to join channel: ${error}`);
        throw error;
      }
    }
  }

  public getClientId(): string {
    debug('Entering getClientId');
    const firstBot = Array.from(this.botManagers.keys())[0];
    const botManager = this.botManagers.get(firstBot);

    if (botManager) {
      const bots = botManager.getAllBots();
      const clientId = bots[0]?.botUserId || '';
      debug(`Returning clientId: ${clientId}`);
      return clientId;
    }

    return '';
  }

  /**
   * Get the topic/description for a Slack channel (best-effort).
   */
  public async getChannelTopic(channelId: string): Promise<string | null> {
    try {
      const firstBot = Array.from(this.botManagers.keys())[0];
      const botManager = this.botManagers.get(firstBot);
      const botInfo = botManager?.getAllBots?.()[0];
      if (!botInfo?.webClient) {
        return null;
      }

      const info = await botInfo.webClient.conversations.info({ channel: channelId });
      if (!info?.ok) {
        return null;
      }

      const topic = info.channel?.topic?.value;
      const purpose = info.channel?.purpose?.value;
      return (purpose || topic || null) as string | null;
    } catch (error) {
      debug(`Failed to fetch Slack channel topic for ${channelId}: ${error}`);
      return null;
    }
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

    const names = this.getBotNames ? this.getBotNames() : [];
    if (!names || names.length === 0) {
      return [];
    }

    return names.map((name) => {
      const cfg = this.getBotConfig ? this.getBotConfig(name) : {};
      const { llmProvider, llmModel, llmEndpoint } = safeLlm(cfg);
      return {
        name: String(name),
        provider: 'slack',
        botId: (() => {
          try {
            const mgr = this.getBotManager(name);
            const bots = mgr?.getAllBots?.() || [];
            return bots[0]?.botUserId ? String(bots[0].botUserId) : undefined;
          } catch {
            return undefined;
          }
        })(),
        messageProvider: 'slack',
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

      // Slack selects bot instances by their configured bot name key.
      const senderKey = agentInstanceName || agentDisplayName;

      let botId = '';
      let botUserName = '';
      try {
        const mgr = this.getBotManager(senderKey);
        const bots = mgr?.getAllBots?.() || [];
        botId = String(bots[0]?.botUserId || '');
        botUserName = String(bots[0]?.botUserName || '');
      } catch {
        botId = '';
        botUserName = '';
      }

      const nameCandidates = Array.from(
        new Set([agentDisplayName, agentInstanceName, botUserName].filter(Boolean))
      );
      return { botId, senderKey, nameCandidates };
    } catch {
      return null;
    }
  }

  public getDefaultChannel(): string {
    debug('Entering getDefaultChannel');
    const firstBot = Array.from(this.botManagers.keys())[0];
    const config = this.botConfigs.get(firstBot);

    if (config) {
      const defaultChannel =
        config.defaultChannel || slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
      debug(`Returning defaultChannel: ${defaultChannel}`);
      return defaultChannel;
    }

    return '';
  }

  /**
   * Best-effort model activity indicator (Slack bot tokens typically cannot set status).
   * Gate behind SLACK_ENABLE_STATUS_UPDATES to avoid noisy failures.
   */
  public async setModelActivity(modelId: string, senderKey?: string): Promise<void> {
    try {
      if (process.env.SLACK_ENABLE_STATUS_UPDATES !== 'true') {
        return;
      }

      const botName = senderKey || Array.from(this.botManagers.keys())[0];
      const last = this.lastModelActivity.get(botName);
      if (last === modelId) {
        return;
      }

      const botManager = this.getBotManager(botName);
      const botInfo = botManager?.getAllBots?.()[0];
      if (!botInfo?.webClient) {
        return;
      }

      // This may require user token scopes; if unsupported, Slack will reject.
      await botInfo.webClient.users.profile.set({
        profile: {
          status_text: `Model: ${modelId}`.slice(0, 100),
          status_emoji: ':robot_face:',
        },
      });

      this.lastModelActivity.set(botName, modelId);
    } catch (error) {
      debug(`Slack setModelActivity failed: ${error}`);
    }
  }

  /**
   * Returns individual service wrappers for each managed Slack bot.
   */
  public getDelegatedServices(): Array<{
    serviceName: string;
    messengerService: IMessengerService;
    botConfig: any;
  }> {
    const names = this.getBotNames();
    return names.map((name) => {
      const cfg = this.getBotConfig(name) || {};
      const serviceName = `slack-${name}`;

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
          try {
            const mgr = this.getBotManager(name);
            const bots = mgr?.getAllBots?.() || [];
            return bots[0]?.botUserId || '';
          } catch {
            return '';
          }
        },

        getDefaultChannel: () =>
          cfg.defaultChannel || slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '',

        setMessageHandler: () => {
          /* global handler managed by parent */
        },

        setModelActivity: async (modelId: string, senderKey?: string) =>
          this.setModelActivity(modelId, senderKey || name),

        sendTyping: async (channelId: string, senderName?: string, threadId?: string) =>
          this.sendTyping(channelId, senderName || name, threadId),

        supportsChannelPrioritization: this.supportsChannelPrioritization,
        scoreChannel: this.scoreChannel ? (cid, meta) => this.scoreChannel!(cid, meta) : undefined,
      };

      return {
        serviceName,
        messengerService: serviceWrapper,
        botConfig: cfg,
      };
    });
  }

  public async shutdown(): Promise<void> {
    debug('Entering shutdown');
    SlackService.instance = undefined;
    debug('SlackService instance cleared');
  }

  /**
   * Channel routing/scoring parity with Discord.
   * When MESSAGE_CHANNEL_ROUTER_ENABLED is true, delegate to ChannelRouter.computeScore.
   * Otherwise return neutral 0 to effectively disable prioritization impact.
   */
  public scoreChannel(channelId: string, metadata?: Record<string, any>): number {
    try {
      const enabled = !!messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED');
      if (!enabled) {
        return 0;
      }
      return channelComputeScore(channelId, metadata);
    } catch (e) {
      debug('scoreChannel error, returning 0', e);
      return 0;
    }
  }

  public getBotManager(botName?: string): SlackBotManager | undefined {
    debug('Entering getBotManager', { botName });
    // Lazy-init from env in case constructor couldn't find configs (unit tests)
    if (this.botManagers.size === 0 && process.env.SLACK_BOT_TOKEN) {
      try {
        this.initializeLegacyConfiguration();
      } catch {}
    }
    if (this.botManagers.size === 0) {
      // As a last resort in unit tests, return a minimal mocked manager instance
      try {
        // Prefer constructing via mocked SlackBotManager if available
        // @ts-ignore constructor signature is mocked in tests
        const mgr = new (SlackBotManager as any)(
          [{ token: 'xoxb-test', signingSecret: '', name: 'MockBot' }],
          'socket'
        );
        if (mgr) {
          return mgr;
        }
      } catch {
        // Fallback: literal stub with getAllBots()
        try {
          const { WebClient } = require('@slack/web-api');
          const webClient = new WebClient('xoxb-test-token');
          return {
            getAllBots: () => [
              { botToken: 'xoxb-test-token', botUserId: 'bot1', botUserName: 'Bot', webClient },
            ],
          } as unknown as SlackBotManager;
        } catch {
          return undefined;
        }
      }
    }
    if (botName) {
      const manager = this.botManagers.get(botName);
      if (manager) {
        return manager;
      }
    }
    // If no botName is provided, or if the named bot is not found, return the first available manager.
    return Array.from(this.botManagers.values())[0];
  }

  public getWelcomeHandler(botName?: string): SlackWelcomeHandler | undefined {
    debug('Entering getWelcomeHandler', { botName });
    if (botName) {
      return this.welcomeHandlers.get(botName);
    }
    return Array.from(this.welcomeHandlers.values())[0];
  }

  /**
   * Get all configured bot names
   */
  public getBotNames(): string[] {
    return Array.from(this.botManagers.keys());
  }

  /**
   * Get configuration for a specific bot
   */
  public getBotConfig(botName: string): any {
    return this.botConfigs.get(botName);
  }

  /**
   * Remove a Slack bot at runtime and update maps. Best-effort stop of socket/RTM clients.
   */
  public async removeBot(botName: string): Promise<boolean> {
    const mgr = this.botManagers.get(botName);
    if (!mgr) {
      return false;
    }
    try {
      const bots = (mgr as any).getAllBots?.() || [];
      for (const b of bots) {
        try {
          await b.socketClient?.disconnect?.();
        } catch {}
        try {
          await b.rtmClient?.disconnect?.();
        } catch {}
      }
    } catch {}
    this.botManagers.delete(botName);
    this.signatureVerifiers.delete(botName);
    this.interactiveHandlers.delete(botName);
    this.interactiveActions.delete(botName);
    this.eventProcessors.delete(botName);
    this.messageProcessors.delete(botName);
    this.welcomeHandlers.delete(botName);
    this.botConfigs.delete(botName);
    this.joinTs.delete(botName);
    this.lastSentEventTs.delete(botName);
    return true;
  }

  /** Send a quick test message using a named bot. */
  public async sendTestMessage(botName: string, channelId: string, text: string): Promise<string> {
    if (!channelId) {
      throw new Error('channelId required');
    }
    const name = botName || Array.from(this.botManagers.keys())[0];
    return this.sendMessageToChannel(channelId, text, name);
  }

  /**
   * Get structured metrics for the SlackService
   */
  public getMetrics(): any {
    const botMetrics: Record<string, any> = {};
    for (const [botName, botManager] of this.botManagers) {
      botMetrics[botName] = {
        connected: botManager ? true : false,
        lastActivity: this.lastSentEventTs.get(botName) || null,
        joinTime: this.joinTs.get(botName) || null,
      };
    }

    return {
      service: 'slack',
      botCount: this.botManagers.size,
      bots: botMetrics,
      globalMetrics: metrics.getMetrics(),
    };
  }
}

export default SlackService;
