import { Application } from 'express';
import express from 'express';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackBotManager } from './SlackBotManager';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { InteractiveActionHandlers } from './InteractiveActionHandlers';
import slackConfig from '@src/config/slackConfig';
import messageConfig from '@src/config/messageConfig';
import { SlackInteractiveActions } from './SlackInteractiveActions';
import SlackMessage from './SlackMessage';

const debug = Debug('app:SlackService');

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private botManager: SlackBotManager;
  private signatureVerifier: SlackSignatureVerifier;
  private interactiveHandler: SlackInteractiveHandler;
  private interactiveActions: SlackInteractiveActions;
  private lastEventTs: string | null = null;
  private lastSentTs: string | null = null;
  private app?: Application;

  private constructor() {
    const botTokens = process.env.SLACK_BOT_TOKEN?.split(',').map(s => s.trim()) || [];
    const appTokens = process.env.SLACK_APP_TOKEN?.split(',').map(s => s.trim()) || [];
    const signingSecrets = process.env.SLACK_SIGNING_SECRET?.split(',').map(s => s.trim()) || [];
    const mode = process.env.SLACK_MODE === 'rtm' ? 'rtm' : 'socket';
    this.botManager = new SlackBotManager(botTokens, appTokens, signingSecrets, mode);
    this.signatureVerifier = new SlackSignatureVerifier(signingSecrets[0]);
    this.interactiveActions = new SlackInteractiveActions(this);
    const interactiveHandlers: InteractiveActionHandlers = {
      sendCourseInfo: async (channel) => this.interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel) => this.interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel) => this.interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId) => this.interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel, userId) => this.interactiveActions.sendInteractiveHelpMessage(channel, userId),
    };
    this.interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
  }

  public static getInstance(): SlackService {
    if (!SlackService.instance) SlackService.instance = new SlackService();
    return SlackService.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.app) {
      debug('Express app not set; call setApp() before initialize() for Slack routing');
      return;
    }
    this.app.post('/slack/action-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      this.handleActionRequest.bind(this)
    );
    this.app.post('/slack/interactive-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      (req, res) => this.interactiveHandler.handleRequest(req, res)
    );
    await this.botManager.initialize();
    for (const botInfo of this.botManager.getAllBots()) {
      await this.joinConfiguredChannelsForBot(botInfo);
    }
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    this.botManager.setMessageHandler(handler);
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const effectiveSender = senderName || displayName;
    const botInfo = this.botManager.getBotByName(effectiveSender) || this.botManager.getAllBots()[0];
    if (this.lastSentTs === threadId || this.lastSentTs === Date.now().toString()) {
      debug(`Duplicate message TS: ${threadId || this.lastSentTs}, skipping`);
      return '';
    }
    try {
      const options: any = {
        channel: channelId,
        text: `*${effectiveSender}*: ${text}`,
        username: effectiveSender,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      };
      if (threadId) options.thread_ts = threadId;
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''} as ${effectiveSender}`);
      this.lastSentTs = result.ts || Date.now().toString();
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      return '';
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId);
  }

  public async fetchMessages(channelId: string): Promise<IMessage[]> {
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const result = await botInfo.webClient.conversations.history({ channel: channelId, limit: 10 });
      return (result.messages || []).map(msg => new SlackMessage(msg.text || '', channelId, msg));
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text = typeof announcement === 'string' ? announcement : announcement.message || 'Announcement';
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channelId, text, displayName);
  }

  private async handleActionRequest(req: express.Request, res: express.Response) {
    try {
      let body = req.body || {};
      if (typeof body === 'string') body = JSON.parse(body);
      if (body.type === 'url_verification' && body.challenge) {
        res.set('Content-Type', 'text/plain');
        res.status(200).send(body.challenge);
        return;
      }
      if (body.payload) {
        const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body.payload;
        if (!payload || !payload.actions || !Array.isArray(payload.actions) || payload.actions.length === 0) {
          res.status(400).send('Bad Request');
          return;
        }
        await this.interactiveHandler.handleBlockAction(payload, res);
        return;
      }
      if (body.type === 'event_callback') {
        const event = body.event;
        if (event.subtype === 'bot_message') {
          debug('Ignoring bot message.');
          res.status(200).send();
          return;
        }
        if (event.event_ts && this.lastEventTs === event.event_ts) {
          debug(`Duplicate event detected (event_ts: ${event.event_ts}). Ignoring.`);
          res.status(200).send();
          return;
        }
        debug(`Processing event: ${JSON.stringify(event)}`);
        this.lastEventTs = event.event_ts;
        res.status(200).send();
        return;
      }
      res.status(400).send('Bad Request');
    } catch (error) {
      debug(`Error handling action request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  private async joinConfiguredChannelsForBot(botInfo: any) {
    const channels = slackConfig.get('SLACK_JOIN_CHANNELS');
    if (!channels) return;
    const channelList = channels.split(',').map(ch => ch.trim());
    for (const channel of channelList) {
      try {
        await botInfo.webClient.conversations.join({ channel });
        debug(`Joined #${channel} for ${botInfo.botUserName}`);
        const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
        await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
      } catch (error) {
        debug(`Failed to join #${channel}: ${error}`);
      }
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    const botInfo = this.botManager.getAllBots()[0];
    await botInfo.webClient.conversations.join({ channel });
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
  }

  public async sendWelcomeMessage(channel: string): Promise<void> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
  }

  public getClientId(): string { return this.botManager.getAllBots()[0]?.botUserId || ''; }
  public getDefaultChannel(): string { return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''; }
  public async shutdown(): Promise<void> { SlackService.instance = undefined; }
  public getBotManager(): SlackBotManager { return this.botManager; }
}
