import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import Debug from 'debug';
import SlackMessage from './SlackMessage';
import { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:SlackBotManager');

interface SlackBotInfo {
  botToken: string;
  appToken?: string;
  signingSecret: string;
  webClient: WebClient;
  socketClient?: SocketModeClient;
  rtmClient?: RTMClient;
  botUserId?: string;
  botUserName?: string;
  config: any;
}

export class SlackBotManager {
  private slackBots: SlackBotInfo[] = [];
  private mode: 'socket' | 'rtm';
  private messageHandler: ((message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>) | null = null;
  private includeHistory: boolean = process.env.SLACK_INCLUDE_HISTORY === 'true';
  private processedEvents: Set<string> = new Set();
  private lastEventTsByChannel: Map<string, string> = new Map();

  constructor(instanceConfigs: any[], mode: 'socket' | 'rtm') {
    debug('Entering constructor');
    this.mode = mode;
    instanceConfigs.forEach((instanceConfig, index) => {
      const { token, appToken, signingSecret } = instanceConfig;
      const webClient = new WebClient(token);
      const botInfo: SlackBotInfo = { botToken: token, appToken, signingSecret, webClient, config: instanceConfig };
      if (this.mode === 'socket' && appToken) {
        debug(`Initializing SocketModeClient with appToken: ${appToken?.substring(0, 8)}...`);
        botInfo.socketClient = new SocketModeClient({ appToken });
      } else if (this.mode === 'rtm') {
        botInfo.rtmClient = new RTMClient(token);
      }
      this.slackBots.push(botInfo);
      debug(`Created bot #${index}: ${botInfo.botUserName || token.substring(0, 8)}...`);
    });
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>) {
    debug('Entering setMessageHandler');
    this.messageHandler = handler;
  }

  public async initialize() {
    debug('Entering initialize');
    for (const botInfo of this.slackBots) {
      try {
        const authTest = await botInfo.webClient.auth.test();
        botInfo.botUserId = authTest.user_id;
        botInfo.botUserName = authTest.user;
        debug(`Bot authenticated: ${botInfo.botUserName} (${botInfo.botUserId})`);
      } catch (error) {
        debug(`Failed to authenticate bot with token ${botInfo.botToken.substring(0, 8)}...: ${error}`);
        throw error;
      }
    }
    await this.startListening();
  }

  private async startListening() {
    debug('Entering startListening');
    const primaryBot = this.slackBots[0];
    const allBotUserIds = this.slackBots.map(b => b.botUserId).filter(Boolean) as string[];

    if (this.mode === 'socket' && primaryBot.socketClient) {
      primaryBot.socketClient.on('connected', () => debug('Socket Mode connected'));
      primaryBot.socketClient.on('disconnected', () => debug('Socket Mode disconnected - check connectivity'));
      primaryBot.socketClient.on('error', (error) => debug('Socket Mode error:', error));

      primaryBot.socketClient.on('slack_event', (event) => {
        const eventId = event.body?.event_id || event.event_ts;
        debug(`General Slack event received: type=${event.type || event.body?.event?.type}, event_id=${eventId}`);
        if (this.processedEvents.has(eventId)) {
          debug(`Duplicate general event skipped: event_id=${eventId}`);
          return;
        }
        this.processedEvents.add(eventId);
      });

      primaryBot.socketClient.on('message', async ({ event }) => {
        debug(`Socket message event received: ${JSON.stringify(event)}`);
        const eventId = event.event_ts;
        if (this.processedEvents.has(eventId)) {
          debug(`Duplicate message event skipped: event_id=${eventId}`);
          return;
        }

        if (!event.text || event.subtype === 'bot_message' || allBotUserIds.includes(event.user)) {
          debug('Message event filtered out: no text, bot message, or self-message');
          return;
        }

        const channel = event.channel || 'unknown';
        const lastTs = this.lastEventTsByChannel.get(channel);
        if (lastTs === event.event_ts) {
          debug(`Duplicate message TS detected in channel ${channel}: ${event.event_ts}`);
          return;
        }
        this.lastEventTsByChannel.set(channel, event.event_ts);
        this.processedEvents.add(eventId);

        debug(`Primary bot received channel message: ${event.text}`);
        if (this.messageHandler) {
          const slackMessage = new SlackMessage(event.text, event.channel, event);
          const history = this.includeHistory ? await this.fetchMessagesForBot(primaryBot, event.channel, 10) : [];
          await this.messageHandler(slackMessage, history, primaryBot.config);
        } else {
          debug('No message handler set for message event');
        }
      });

      try {
        debug('Starting primary socket client');
        await primaryBot.socketClient.start();
        debug('Primary socket client started for channels');
      } catch (error) {
        debug('Failed to start primary socket client:', error);
        throw error;
      }
    }

    for (const botInfo of this.slackBots) {
      if (this.mode === 'socket' && botInfo.socketClient) {
        botInfo.socketClient.on('slack_event', (event) => {
          const eventId = event.body?.event_id || event.event_ts;
          // Only process message events for DMs here, skip interactive payloads
          if (event.type !== 'message') {
            debug(`Skipping non-message event for DM bot ${botInfo.botUserName}: type=${event.type}`);
            return;
          }
          debug(`General Slack event received for DM bot ${botInfo.botUserName}: ${JSON.stringify(event)}`);
          if (this.processedEvents.has(eventId)) {
            debug(`Duplicate general event skipped: event_id=${eventId}`);
            return;
          }
          this.processedEvents.add(eventId);
        });

        botInfo.socketClient.on('message', async ({ event }) => {
          debug(`Socket message event received: ${JSON.stringify(event)}`);
          const eventId = event.event_ts;
          if (this.processedEvents.has(eventId)) {
            debug(`Duplicate message event skipped: event_id=${eventId}`);
            return;
          }

          if (event.channel_type !== 'im' || !event.text || event.subtype === 'bot_message' || event.user === botInfo.botUserId) {
            debug('Message event filtered out');
            return;
          }

          const channel = event.channel || 'unknown';
          const lastTs = this.lastEventTsByChannel.get(channel);
          if (lastTs === event.event_ts) {
            debug(`Duplicate message TS detected in channel ${channel}: ${event.event_ts}`);
            return;
          }
          this.lastEventTsByChannel.set(channel, event.event_ts);
          this.processedEvents.add(eventId);

          debug(`${botInfo.botUserName} received: ${event.text}`);
          if (this.messageHandler) {
            const slackMessage = new SlackMessage(event.text, event.channel, event);
            await this.messageHandler(slackMessage, [], botInfo.config);
          }
        });

        if (botInfo !== primaryBot) {
          try {
            debug(`Starting socket client for ${botInfo.botUserName}`);
            await botInfo.socketClient.start();
            debug(`Listener started for ${botInfo.botUserName}`);
          } catch (error) {
            debug(`Failed to start socket client for ${botInfo.botUserName}:`, error);
            throw error;
          }
        }
      } else if (this.mode === 'rtm' && botInfo.rtmClient) {
        try {
          debug(`Starting RTM client for ${botInfo.botUserName}`);
          await botInfo.rtmClient.start();
          debug(`RTM client started for ${botInfo.botUserName}`);
        } catch (error) {
          debug(`Failed to start RTM client for ${botInfo.botUserName}:`, error);
          throw error;
        }
      }
    }
  }

  private async fetchMessagesForBot(botInfo: SlackBotInfo, channel: string, limit = 10): Promise<IMessage[]> {
    debug('Entering fetchMessagesForBot');
    const result = await botInfo.webClient.conversations.history({ channel, limit });
    return (result.messages || []).map(msg => new SlackMessage(msg.text || '', channel, msg));
  }

  public getBotByName(name: string): SlackBotInfo | undefined {
    debug('Entering getBotByName');
    return this.slackBots.find(bot => bot.botUserName?.toLowerCase() === name.toLowerCase());
  }

  public getAllBots(): SlackBotInfo[] {
    debug('Entering getAllBots');
    return this.slackBots;
  }

  public async handleMessage(message: IMessage, history: IMessage[] = [], botConfig: any): Promise<string> {
    debug('Entering handleMessage');
    if (this.messageHandler) {
      debug(`Handling message: "${message.getText()}"`);
      return await this.messageHandler(message, history, botConfig);
    }
    debug('No message handler set');
    return '';
  }
}
