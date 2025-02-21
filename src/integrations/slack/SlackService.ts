import { Application, Request, Response, NextFunction } from 'express';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackBotManager } from './SlackBotManager';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { InteractiveActionHandlers } from './InteractiveActionHandlers';
import slackConfig from './interfaces/slackConfig';
import { SlackInteractiveActions } from './SlackInteractiveActions';

const debug = Debug('app:SlackService');

export class SlackService implements IMessengerService {
  private static instance: SlackService;
  private botManager: SlackBotManager;
  private signatureVerifier: SlackSignatureVerifier;
  private interactiveHandler: SlackInteractiveHandler;
  private interactiveActions: SlackInteractiveActions;
  private lastEventTs: string | null = null;
  private lastSentTs: string | null = null; // Resubmission check

  private constructor() {
    const botTokens = process.env.SLACK_BOT_TOKEN?.split(',').map(s => s.trim()) || [];
    const appTokens = process.env.SLACK_APP_TOKEN?.split(',').map(s => s.trim()) || [];
    const signingSecrets = process.env.SLACK_SIGNING_SECRET?.split(',').map(s => s.trim()) || [];
    const mode = process.env.SLACK_MODE === 'rtm' ? 'rtm' : 'socket';
    this.botManager = new SlackBotManager(botTokens, appTokens, signingSecrets, mode);
    this.signatureVerifier = new SlackSignatureVerifier(signingSecrets[0]);
    this.interactiveActions = new SlackInteractiveActions(this.botManager); // Pass botManager
    const interactiveHandlers: InteractiveActionHandlers = {
      sendCourseInfo: async (channel) => this.interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel) => this.interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel) => this.interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId) => this.interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel, userId) => this.interactiveActions.sendInteractiveHelpMessage(channel, userId)
    };
    this.interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
  }

  public static getInstance(): SlackService {
    if (!SlackService.instance) SlackService.instance = new SlackService();
    return SlackService.instance;
  }

  public async initialize(app: Application): Promise<void> {
    app.post('/slack/action-endpoint', 
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      this.handleActionRequest.bind(this)
    );
    app.post('/slack/interactive-endpoint', 
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      (req, res) => this.interactiveHandler.handleRequest(req, res)
    );
    await this.botManager.initialize();
    for (const botInfo of this.botManager.getAllBots()) {
      await this.joinConfiguredChannelsForBot(botInfo);
    }
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    this.botManager.setMessageHandler(handler);
  }

  public async sendMessage(channel: string, text: string, senderName?: string, ts?: string) {
    const botInfo = this.botManager.getBotByName(senderName || 'Jeeves') || this.botManager.getAllBots()[0];
    if (ts && ts === this.lastSentTs) {
      debug(`Duplicate message TS: ${ts}, skipping`);
      return;
    }
    try {
      await botInfo.webClient.chat.postMessage({
        channel,
        text: `*${botInfo.botUserName || senderName || 'Jeeves'}*: ${text}`,
        username: botInfo.botUserName || senderName || 'Jeeves',
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      });
      debug(`Sent message to #${channel} as ${botInfo.botUserName || senderName}`);
      this.lastSentTs = ts || Date.now().toString();
    } catch (error) {
      debug(`Failed to send message: ${error}`);
    }
  }

  public async fetchMessages(channel: string): Promise<IMessage[]> {
    const botInfo = this.botManager.getBotByName('Jeeves') || this.botManager.getAllBots()[0];
    try {
      const result = await botInfo.webClient.conversations.history({ channel, limit: 10 });
      return (result.messages || []).map(msg => new SlackMessage(msg.text || '', channel, msg));
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }

  private async handleActionRequest(req: Request, res: Response) {
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
        res.status(200).send(); // Event handled by botManager
        return;
      }
      res.status(400).send('Bad Request');
    } catch (error) {
      debug(`Error handling action request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  private async joinConfiguredChannelsForBot(botInfo: any) {
    const channels = process.env.SLACK_JOIN_CHANNELS;
    if (!channels) return;
    const channelList = channels.split(',').map(ch => ch.trim());
    for (const channel of channelList) {
      try {
        await botInfo.webClient.conversations.join({ channel });
        debug(`Joined #${channel} for ${botInfo.botUserName}`);
        await this.sendMessage(channel, `Welcome from ${botInfo.botUserName}!`, botInfo.botUserName);
      } catch (error) {
        debug(`Failed to join #${channel}: ${error}`);
      }
    }
  }

  public getClientId(): string { return this.botManager.getAllBots()[0]?.botUserId || ''; }
  public getDefaultChannel(): string { return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''; }
  public async shutdown(): Promise<void> { SlackService.instance = undefined; }
}
