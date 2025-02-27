import { Application } from 'express';
import express from 'express';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackBotManager } from './SlackBotManager';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { SlackInteractiveActions } from './SlackInteractiveActions';
import slackConfig from '@src/config/slackConfig';
import messageConfig from '@src/config/messageConfig';
import { SlackEventProcessor } from './SlackEventProcessor';
import { SlackMessageProcessor } from './SlackMessageProcessor';
import { SlackWelcomeHandler } from './SlackWelcomeHandler';
import SlackMessage from './SlackMessage';
import { KnownBlock } from '@slack/web-api';
import { getLlmProvider } from '@src/llm/getLlmProvider';

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
    const botTokens = slackConfig.get('SLACK_BOT_TOKEN')?.split(',').map((s: string) => s.trim()) || [];
    const appTokens = slackConfig.get('SLACK_APP_TOKEN')?.split(',').map((s: string) => s.trim()) || [];
    const signingSecrets = slackConfig.get('SLACK_SIGNING_SECRET')?.split(',').map((s: string) => s.trim()) || [];
    const mode = (slackConfig.get('SLACK_MODE') as 'socket' | 'rtm') || 'socket';

    if (!botTokens.length || !signingSecrets.length) {
      debug('Error: Missing required Slack configuration (bot tokens or signing secrets)');
      throw new Error('Slack configuration incomplete');
    }

    debug(`Initializing with botTokens: ${botTokens.length}, appTokens: ${appTokens.length}, mode: ${mode}`);
    this.botManager = new SlackBotManager(botTokens, appTokens, signingSecrets, mode);
    this.signatureVerifier = new SlackSignatureVerifier(signingSecrets[0]);
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

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>): void {
    debug('Entering setMessageHandler');
    if (typeof handler !== 'function') {
      debug('Error: Invalid message handler provided');
      throw new Error('Message handler must be a function');
    }
    this.botManager.setMessageHandler(async (message, history) => {
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
        const payload = await this.messageProcessor.constructPayload(enrichedMessage, history);
        const userMessage = payload.messages[payload.messages.length - 1].content;
        const formattedHistory: IMessage[] = history.map(h => new SlackMessage(h.getText(), message.getChannelId(), { role: h.role }));
        const metadataWithMessages = { ...payload.metadata, messages: payload.messages };
        const llmProviders = getLlmProvider();
        if (!llmProviders.length) {
          debug('No LLM providers available');
          return 'Sorry, I’m having trouble processing your request right now.';
        }
        const llmResponse = await llmProviders[0].generateChatCompletion(userMessage, formattedHistory, metadataWithMessages);
        debug('LLM Response:', llmResponse);
        const { text: fallbackText, blocks } = await this.messageProcessor.processResponse(llmResponse);
        const channelId = enrichedMessage.getChannelId();
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
    const decodedText = text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    debug(`Raw text: ${text.substring(0, 50) + (text.length > 50 ? '...' : '')}`);
    debug(`Decoded text: ${decodedText.substring(0, 50) + (decodedText.length > 50 ? '...' : '')}`);
    const displayName = senderName || messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const botInfo = this.botManager.getBotByName(displayName) || this.botManager.getAllBots()[0];
    if (this.lastSentEventTs === Date.now().toString()) {
      debug(`Immediate duplicate message detected: ${this.lastSentEventTs}, skipping`);
      return '';
    }
    try {
      const options: any = {
        channel: channelId,
        text: decodedText || (blocks?.length ? 'Message with interactive content' : 'No content provided'),
        username: displayName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      };
      if (threadId) options.thread_ts = threadId;
      if (blocks?.length) options.blocks = blocks;
      debug(`Final text to post: ${options.text.substring(0, 50) + (options.text.length > 50 ? '...' : '')}`);
      const result = await botInfo.webClient.chat.postMessage(options);
      this.lastSentEventTs = result.ts || Date.now().toString();
      debug(`Message sent successfully: channel=${channelId}, ts=${result.ts}, thread=${threadId || 'none'}`);
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

  public async fetchMessages(channelId: string): Promise<IMessage[]> {
    debug('Entering fetchMessages', { channelId });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const result = await botInfo.webClient.conversations.history({ channel: channelId, limit: 10 });
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
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channelId, text, displayName);
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
    const defaultChannel = slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
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
