import { Application } from 'express';
import express from 'express';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackBotManager } from './SlackBotManager';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { SlackInteractiveActions } from './SlackInteractiveActions';
import { SlackEventProcessor } from './SlackEventProcessor';
import { SlackMessageProcessor } from './SlackMessageProcessor';
import { SlackWelcomeHandler } from './SlackWelcomeHandler';
import SlackMessage from './SlackMessage';
import { KnownBlock } from '@slack/web-api';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

// Routing
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';

const debug = Debug('app:SlackService:verbose');

// Module extractions
import { SlackMessageIO, ISlackMessageIO } from './modules/ISlackMessageIO';
import { SlackEventBus, ISlackEventBus } from './modules/ISlackEventBus';
import { SlackBotFacade, ISlackBotFacade } from './modules/ISlackBotFacade';

/**
 * SlackService implementation supporting multi-instance configuration
 * Uses BotConfigurationManager for consistent multi-bot support across platforms
 */
export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private botManagers: Map<string, SlackBotManager> = new Map();
  private signatureVerifiers: Map<string, SlackSignatureVerifier> = new Map();
  private interactiveHandlers: Map<string, SlackInteractiveHandler> = new Map();
  private interactiveActions: Map<string, SlackInteractiveActions> = new Map();
  private eventProcessors: Map<string, SlackEventProcessor> = new Map();
  private messageProcessors: Map<string, SlackMessageProcessor> = new Map();
  private welcomeHandlers: Map<string, SlackWelcomeHandler> = new Map();
  private lastSentEventTs: Map<string, string> = new Map();
  private app?: Application;
  private joinTs: Map<string, number> = new Map();
  private botConfigs: Map<string, any> = new Map();
  private messageIO: ISlackMessageIO;
  private eventBus: ISlackEventBus;
  private botFacade: ISlackBotFacade;

  // Channel prioritization support is available; actual scoring is feature-flagged
  public supportsChannelPrioritization: boolean = true;

  private constructor() {
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
    const slackBotConfigs = configManager.getAllBots().filter(bot => 
      bot.messageProvider === 'slack' && bot.slack?.botToken
    );

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
      signingSecret: botConfig.slack.signingSecret,
      name: botName,
      appToken: botConfig.slack.appToken,
      defaultChannel: botConfig.slack.defaultChannelId,
      joinChannels: botConfig.slack.joinChannels,
      mode: botConfig.slack.mode || 'socket'
    };

    const botManager = new SlackBotManager([instance], instance.mode);
    const signatureVerifier = new SlackSignatureVerifier(instance.signingSecret);
    const interactiveActions = new SlackInteractiveActions(this);
    
    const interactiveHandlers = {
      sendCourseInfo: async (channel: string) => interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel: string) => interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel: string) => interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId: string) => interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel: string, userId: string) => interactiveActions.sendInteractiveHelpMessage(channel, userId),
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
      throw new Error('Express app not configured');
    }
    // Register routes and start bot
    const signatureVerifier = this.signatureVerifiers.get(botName)!;
    const eventProcessor = this.eventProcessors.get(botName)!;
    const interactiveHandler = this.interactiveHandlers.get(botName)!;
    this.eventBus.registerBotRoutes(this.app, botName, signatureVerifier, eventProcessor, interactiveHandler);

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
    let instances: Array<{token: string; signingSecret: string; name: string}> = [];
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
              appToken: '',
              defaultChannelId: '',
              joinChannels: '',
              mode
            }
          };
          this.initializeBotInstance(legacyConfig);
        });
      } else {
        debug('Error: No Slack configuration found');
        throw new Error('Slack configuration incomplete');
      }
    } catch (error) {
      debug(`Legacy configuration loading failed: ${error}`);
      throw new Error(`Failed to load legacy Slack configuration: ${error}`);
    }
  }

  public static getInstance(): SlackService {
    debug('Entering getInstance');
    if (!SlackService.instance) {
      debug('Creating new SlackService instance');
      SlackService.instance = new SlackService();
    }
    debug('Returning SlackService instance');
    return SlackService.instance;
  }

  public async initialize(): Promise<void> {
    debug('Entering initialize');
    if (!this.app) {
      debug('Express app not set; call setApp() before initialize()');
      throw new Error('Express app not configured');
    }

    debug(`Initializing ${this.botManagers.size} Slack bot managers...`);
    
    for (const [botName, botManager] of this.botManagers) {
      debug(`Registering routes for bot: ${botName}`);

      // Use event bus to register routes/handlers
      const signatureVerifier = this.signatureVerifiers.get(botName)!;
      const eventProcessor = this.eventProcessors.get(botName)!;
      const interactiveHandler = this.interactiveHandlers.get(botName)!;

      // Keep original urlencoded middleware where needed
      this.app.post(
        `/slack/${botName}/action-endpoint`,
        express.urlencoded({ extended: true })
      );
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
        debug(`Bot manager ${botName} initialized successfully, joinTs: ${this.joinTs.get(botName)}`);

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
  }

  public setApp(app: Application): void {
    debug('Entering setApp', { appProvided: !!app });
    if (!app) {
      debug('Error: No app provided');
      throw new Error('Application instance required');
    }
    this.app = app;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void {
    debug('Entering setMessageHandler');
    if (typeof handler !== 'function') {
      debug('Error: Invalid message handler provided');
      throw new Error('Message handler must be a function');
    }

    for (const [botName, botManager] of this.botManagers) {
      const messageProcessor = this.messageProcessors.get(botName);
      if (!messageProcessor) continue;

      botManager.setMessageHandler(async (message, history, botConfig) => {
        debug(`[${botName}] Received message: text="${message.getText()}", event_ts=${message.data.event_ts}, thread_ts=${message.data.thread_ts}, channel=${message.getChannelId()}`);
        
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
          const enrichedMessage: SlackMessage = await messageProcessor.enrichSlackMessage(message as unknown as SlackMessage);
          const channelId = enrichedMessage.getChannelId();

          // Fetch last 10 messages from the channel
          const historyMessages = await this.fetchMessages(channelId, 10, botName);
          debug(`[${botName}] Fetched ${historyMessages.length} history messages for channel ${channelId}`);

          const payload = await messageProcessor.constructPayload(enrichedMessage, historyMessages);
          const userMessage = payload.messages[payload.messages.length - 1].content;
          // historyMessages are already SlackMessage instances implementing IMessage in Slack domain.
          // Cast to IMessage[] to satisfy typing for LLM provider history input.
          const formattedHistory: IMessage[] = historyMessages as unknown as IMessage[];
          const metadataWithMessages = { ...payload.metadata, messages: payload.messages };
          const llmProviders = getLlmProvider();
          
          if (!llmProviders.length) {
            debug(`[${botName}] No LLM providers available`);
            return 'Sorry, I\'m having trouble processing your request right now.';
          }
          
          let llmResponse: string;
          try {
            const cfg = this.botConfigs.get(botName) as any;
            const llm = cfg?.llm;
            if (llm && (llm.provider || '').toLowerCase() === 'openwebui' && (llm.apiUrl || llm.model)) {
              const { generateChatCompletionDirect } = require('@integrations/openwebui/directClient');
              llmResponse = await generateChatCompletionDirect(
                {
                  apiUrl: llm.apiUrl,
                  authHeader: llm.authHeader,
                  model: llm.model,
                },
                userMessage,
                formattedHistory,
                (llm.systemPrompt || metadataWithMessages?.systemPrompt || '')
              );
            } else {
              llmResponse = await llmProviders[0].generateChatCompletion(
                userMessage,
                formattedHistory,
                metadataWithMessages
              );
            }
          } catch (e) {
            debug(`[${botName}] LLM call failed, falling back: ${e}`);
            llmResponse = await llmProviders[0].generateChatCompletion(
              userMessage,
              formattedHistory,
              metadataWithMessages
            );
          }
          debug(`[${botName}] LLM Response:`, llmResponse);
          
          const { text: fallbackText, blocks } = await messageProcessor.processResponse(llmResponse);
          debug(`[${botName}] Sending response to channel ${channelId} with thread_ts: ${threadTs}`);
          
          const sentTs = await this.sendMessageToChannel(
            channelId, 
            fallbackText, 
            botName, 
            threadTs, 
            blocks
          );
          
          if (sentTs) {
            this.lastSentEventTs.set(botName, eventTs);
            debug(`[${botName}] Response sent successfully, lastSentEventTs updated to: ${eventTs}`);
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
    blocks?: KnownBlock[]
  ): Promise<string> {
    debug('Entering sendMessageToChannel (delegated)', {
      channelId,
      textPreview: text ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : '',
      senderName,
      threadId,
    });
    return this.messageIO.sendMessageToChannel(channelId, text, senderName, threadId, blocks);
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    debug('Entering getMessagesFromChannel', { channelId });
    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }
    
    // Default to first bot for backward compatibility
    const firstBot = Array.from(this.botManagers.keys())[0];
    return this.fetchMessages(channelId, 10, firstBot);
  }

  public async fetchMessages(channelId: string, limit: number = 10, botName?: string): Promise<IMessage[]> {
    debug('Entering fetchMessages (delegated)', { channelId, limit, botName });
    return this.messageIO.fetchMessages(channelId, limit, botName);
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    debug('Entering sendPublicAnnouncement', { 
      channelId, 
      announcement: typeof announcement === 'string' ? announcement : 'object' 
    });
    
    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }
    
    const text = typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';
    
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

  public getDefaultChannel(): string {
    debug('Entering getDefaultChannel');
    const firstBot = Array.from(this.botManagers.keys())[0];
    const config = this.botConfigs.get(firstBot);
    
    if (config) {
      const defaultChannel = config.defaultChannel || '';
      debug(`Returning defaultChannel: ${defaultChannel}`);
      return defaultChannel;
    }
    
    return '';
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
    if (botName) {
      return this.botManagers.get(botName);
    }
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
    if (!mgr) return false;
    try {
      const bots = (mgr as any).getAllBots?.() || [];
      for (const b of bots) {
        try { await b.socketClient?.disconnect?.(); } catch {}
        try { await b.rtmClient?.disconnect?.(); } catch {}
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
    if (!channelId) throw new Error('channelId required');
    const cfg = this.getBotConfig(botName);
    const name = botName || Array.from(this.botManagers.keys())[0];
    return this.sendMessageToChannel(channelId, text, name);
  }
}

export default SlackService;
