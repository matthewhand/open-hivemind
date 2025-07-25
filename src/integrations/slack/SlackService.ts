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
import slackConfig from '@config/slackConfig';
import * as fs from 'fs';
import * as path from 'path';

const debug = Debug('app:SlackService:verbose');

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private botManager: SlackBotManager;
  private signatureVerifier: SlackSignatureVerifier;
  private interactiveHandler: SlackInteractiveHandler;
  private interactiveActions: SlackInteractiveActions;
  private eventProcessor: SlackEventProcessor;
  private messageProcessor: SlackMessageProcessor;
  private welcomeHandler: SlackWelcomeHandler;
  private lastSentEventTs: string | null = null;
  private app?: Application;
  private joinTs: number = Date.now() / 1000;

  private constructor() {
    debug('Entering constructor');
    
    let instances: Array<{token: string; signingSecret: string; name: string}> = [];
    let mode: 'socket' | 'rtm' = 'socket';
    
    // First try to get config from config manager
    const botToken = slackConfig.get('SLACK_BOT_TOKEN');
    const signingSecret = slackConfig.get('SLACK_SIGNING_SECRET');
    
    // Check if we have valid tokens from config manager
    const hasValidTokensFromConfig = botToken && signingSecret &&
                                   botToken.trim() !== '' && signingSecret.trim() !== '';
    
    if (hasValidTokensFromConfig) {
      instances = [{
        token: botToken,
        signingSecret: signingSecret,
        name: 'DefaultBot'
      }];
      mode = slackConfig.get('SLACK_MODE') === 'rtm' ? 'rtm' : 'socket';
    } else {
      // Check if we're in test environment - if so, don't fall back to config file
      const isTestEnv = process.env.NODE_ENV === 'test';
      if (!isTestEnv) {
        // Only fall back to config file in non-test environments
        const configDir = process.env.NODE_CONFIG_DIR || 'config';
        const messengersConfigPath = path.join(configDir, 'messengers.json');
        const messengersConfig = JSON.parse(fs.readFileSync(messengersConfigPath, 'utf-8'));
        instances = messengersConfig.slack?.instances || [];
        mode = messengersConfig.slack?.mode || 'socket';
      }
    }

    if (!instances || instances.length === 0) {
      debug('Error: Missing required Slack configuration');
      throw new Error('Slack configuration incomplete');
    }

    debug(`Initializing with ${instances.length} instances in ${mode} mode`);
    this.botManager = new SlackBotManager(instances, mode);
    this.signatureVerifier = new SlackSignatureVerifier(instances[0].signingSecret);
    this.interactiveActions = new SlackInteractiveActions(this);
    const interactiveHandlers = {
      sendCourseInfo: async (channel: string) => this.interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel: string) => this.interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel: string) => this.interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId: string) => this.interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel: string, userId: string) => this.interactiveActions.sendInteractiveHelpMessage(channel, userId),
      handleButtonClick: async (channel: string, userId: string, actionId: string) => this.welcomeHandler.handleButtonClick(channel, userId, actionId),
    };
    this.interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
    this.eventProcessor = new SlackEventProcessor(this);
    this.messageProcessor = new SlackMessageProcessor(this.botManager);
    this.welcomeHandler = new SlackWelcomeHandler(this.botManager);
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
    debug('Registering Slack routes...');
    this.app.post('/slack/action-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => {
        try {
          this.signatureVerifier.verify(req, res, next);
        } catch (error) {
          debug(`Signature verification failed: ${error}`);
          res.status(400).send('Invalid request signature');
        }
      },
      (req, res) => this.eventProcessor.handleActionRequest(req, res)
    );
    this.app.post('/slack/interactive-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => {
        try {
          this.signatureVerifier.verify(req, res, next);
        } catch (error) {
          debug(`Signature verification failed: ${error}`);
          res.status(400).send('Invalid request signature');
        }
      },
      (req, res) => this.interactiveHandler.handleRequest(req, res)
    );
    this.app.post('/slack/help',
      express.urlencoded({ extended: true }),
      (req, res) => this.eventProcessor.handleHelpRequest(req, res)
    );

    try {
      await this.botManager.initialize();
      this.joinTs = Date.now() / 1000;
      debug(`Bot manager initialized successfully, joinTs: ${this.joinTs}`);
      const bots = this.botManager.getAllBots();
      for (const botInfo of bots) {
        debug(`Joining channels for bot: ${botInfo.botUserName || botInfo.botToken.substring(0, 8)}`);
        await this.welcomeHandler.joinConfiguredChannelsForBot(botInfo);
      }
      await this.eventProcessor.debugEventPermissions();
    } catch (error) {
      debug(`Initialization failed: ${error}`);
      throw new Error(`Failed to initialize SlackService: ${error}`);
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
    this.botManager.setMessageHandler(async (message, history, botConfig) => {
      debug(`Received message: text="${message.getText()}", event_ts=${message.data.event_ts}, thread_ts=${message.data.thread_ts}, channel=${message.getChannelId()}`);
      const messageTs = parseFloat(message.data.ts || '0');
      if (messageTs < this.joinTs) {
        debug(`Ignoring old message: ts=${messageTs}, joinTs=${this.joinTs}`);
        return '';
      }
      if (!message.getText()?.trim()) {
        debug('Empty message text detected, skipping response');
        return '';
      }
      if (this.eventProcessor.hasDeletedMessage(message.data.ts)) {
        debug(`Ignoring deleted message: ts=${message.data.ts}`);
        return '';
      }

      const eventTs = message.data.event_ts;
      if (this.lastSentEventTs === eventTs) {
        debug(`Duplicate event_ts detected: ${eventTs}, skipping`);
        return '';
      }

      const threadTs = message.data.thread_ts || message.data.ts;
      try {
        const enrichedMessage = await this.messageProcessor.enrichSlackMessage(message);
        const channelId = enrichedMessage.getChannelId();

        // Fetch last 10 messages from the channel (adjust limit as needed)
        const historyMessages = await this.fetchMessages(channelId, 10);
        debug(`Fetched ${historyMessages.length} history messages for channel ${channelId}`);

        const payload = await this.messageProcessor.constructPayload(enrichedMessage, historyMessages);
        const userMessage = payload.messages[payload.messages.length - 1].content;
        const formattedHistory: IMessage[] = historyMessages.map(h => new SlackMessage(h.getText(), channelId, { role: h.isFromBot() ? 'assistant' : 'user' }));
        const metadataWithMessages = { ...payload.metadata, messages: payload.messages };
        const llmProviders = getLlmProvider();
        if (!llmProviders.length) {
          debug('No LLM providers available');
          return 'Sorry, I’m having trouble processing your request right now.';
        }
        const llmResponse = await llmProviders[0].generateChatCompletion(userMessage, formattedHistory, metadataWithMessages);
        debug('LLM Response:', llmResponse);
        const { text: fallbackText, blocks } = await this.messageProcessor.processResponse(llmResponse);
        debug(`Sending response to channel ${channelId} with thread_ts: ${threadTs}`);
        const sentTs = await this.sendMessageToChannel(channelId, fallbackText, undefined, threadTs, blocks);
        if (sentTs) {
          this.lastSentEventTs = eventTs;
          debug(`Response sent successfully, lastSentEventTs updated to: ${this.lastSentEventTs}`);
        }
        return fallbackText;
      } catch (error) {
        debug(`Error processing message: ${error}`);
        return 'Oops, something went wrong. Please try again later.';
      }
    });
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string, blocks?: KnownBlock[]): Promise<string> {
    debug('Entering sendMessageToChannel', { channelId, text: text.substring(0, 50) + (text.length > 50 ? '...' : ''), senderName, threadId });
    if (!channelId || !text) {
      debug('Error: Missing channelId or text', { channelId, text });
      throw new Error('Channel ID and text are required');
    }
    const rawText = text;
    let decodedText = rawText
      .replace(/"/gi, '"')
      .replace(/"/gi, '"')
      .replace(/["'"]|["'"]|["'"]/gi, '"')
      .replace(/&(?:amp;)?quot;/gi, '"')
      .replace(/'/gi, "'")
      .replace(/&[^;\s]+;/g, match => {
        const decoded = match
          .replace(/&/gi, '&')
          .replace(/"/gi, '"')
          .replace(/"/gi, '"')
          .replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));
        return decoded;
      })
      .replace(/(\w)"(\w)/g, "$1'$2")
      .replace(/(\w)"(\s|$)/g, "$1'$2");
    decodedText = decodedText
      .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
      .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
      .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
      .replace(/"/gi, '"')
      .replace(/"/gi, "'");
    debug(`Raw text: ${rawText.substring(0, 50) + (rawText.length > 50 ? '...' : '')}`);
    debug(`Decoded text: ${decodedText.substring(0, 50) + (decodedText.length > 50 ? '...' : '')}`);
    const botInfo = senderName ? this.botManager.getBotByName(senderName) : this.botManager.getAllBots()[0];
    if (!botInfo) {
      debug('Error: Bot not found');
      throw new Error('Bot not found');
    }
    if (this.lastSentEventTs === Date.now().toString()) {
      debug(`Immediate duplicate message detected: ${this.lastSentEventTs}, skipping`);
      return '';
    }
    try {
      const options: any = {
        channel: channelId,
        text: decodedText || 'No content provided',
        username: botInfo.botUserName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
        parse: 'none'
      };
      if (threadId) options.thread_ts = threadId;
      if (blocks?.length) options.blocks = blocks;
      debug(`Final text to post: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`);
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''}, ts=${result.ts}`);
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      throw new Error(`Message send failed: ${error}`);
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    debug('Entering getMessagesFromChannel', { channelId });
    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }
    return this.fetchMessages(channelId);
  }

  public async fetchMessages(channelId: string, limit: number = 10): Promise<IMessage[]> {
    debug('Entering fetchMessages', { channelId, limit });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const result = await botInfo.webClient.conversations.history({ channel: channelId, limit });
      const messages = (result.messages || []).map(msg => new SlackMessage(msg.text || '', channelId, msg));
      debug(`Fetched ${messages.length} messages from channel ${channelId}`);
      return messages;
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    debug('Entering sendPublicAnnouncement', { channelId, announcement: typeof announcement === 'string' ? announcement : 'object' });
    if (!channelId) {
      debug('Error: No channelId provided');
      throw new Error('Channel ID required');
    }
    const text = typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';
    const botInfo = this.botManager.getAllBots()[0];
    await this.sendMessageToChannel(channelId, text, botInfo.botUserName);
  }

  public async joinChannel(channel: string): Promise<void> {
    debug('Entering joinChannel', { channel });
    if (!channel) {
      debug('Error: No channel provided');
      throw new Error('Channel ID required');
    }
    const botInfo = this.botManager.getAllBots()[0];
    try {
      await botInfo.webClient.conversations.join({ channel });
      await this.welcomeHandler.sendBotWelcomeMessage(channel);
      debug(`Successfully joined and welcomed channel: ${channel}`);
    } catch (error) {
      debug(`Failed to join channel: ${error}`);
      throw error;
    }
  }

  public getClientId(): string {
    debug('Entering getClientId');
    const clientId = this.botManager.getAllBots()[0]?.botUserId || '';
    debug(`Returning clientId: ${clientId}`);
    return clientId;
  }

  public getDefaultChannel(): string {
    debug('Entering getDefaultChannel');
    const defaultChannel = this.botManager.getAllBots()[0]?.config.defaultChannel || '';
    debug(`Returning defaultChannel: ${defaultChannel}`);
    return defaultChannel;
  }

  public async shutdown(): Promise<void> {
    debug('Entering shutdown');
    SlackService.instance = undefined;
    debug('SlackService instance cleared');
  }

  public getBotManager(): SlackBotManager {
    debug('Entering getBotManager');
    return this.botManager;
  }

  public getWelcomeHandler(): SlackWelcomeHandler {
    debug('Entering getWelcomeHandler');
    return this.welcomeHandler;
  }
}

