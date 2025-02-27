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
}

export class SlackBotManager {
  private slackBots: SlackBotInfo[] = [];
  private mode: 'socket' | 'rtm';
  public messageHandler: ((message: IMessage, historyMessages: IMessage[]) => Promise<string>) | null = null;
  private includeHistory: boolean = process.env.SLACK_INCLUDE_HISTORY === 'true';
  private lastEventTs: string | null = null;

  constructor(botTokens: string[], appTokens: string[], signingSecrets: string[], mode: 'socket' | 'rtm') {
    debug('Entering constructor');
    this.mode = mode;
    botTokens.forEach((botToken, index) => {
      const appToken = index < appTokens.length ? appTokens[index] : undefined;
      const signingSecret = index < signingSecrets.length ? signingSecrets[index] : signingSecrets[0];
      const webClient = new WebClient(botToken);
      const botInfo: SlackBotInfo = { botToken, appToken, signingSecret, webClient };
      if (this.mode === 'socket' && appToken) {
        debug(`Initializing SocketModeClient with appToken: ${appToken?.substring(0, 8)}...`);
        botInfo.socketClient = new SocketModeClient({ appToken });
      } else if (this.mode === 'rtm') {
        botInfo.rtmClient = new RTMClient(botToken);
      }
      this.slackBots.push(botInfo);
      debug(`Created bot #${index}: ${botInfo.botUserName || botToken.substring(0, 8)}...`);
    });
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
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
      primaryBot.socketClient.on('message', async ({ event }) => {
        debug(`Socket event received: ${JSON.stringify(event)}`);
        if (!event.text || event.subtype === 'bot_message' || allBotUserIds.includes(event.user)) {
          debug('Event filtered out: no text, bot message, or self-message');
          return;
        }
        if (event.event_ts === this.lastEventTs) {
          debug('Duplicate event ignored:', event.event_ts);
          return;
        }
        debug(`Primary bot received channel message: ${event.text}`);
        if (this.messageHandler) {
          const slackMessage = new SlackMessage(event.text, event.channel, event);
          const history = this.includeHistory ? await this.fetchMessagesForBot(primaryBot, event.channel, 10) : [];
          await this.messageHandler(slackMessage, history);
        } else {
          debug('No message handler set for event');
        }
        this.lastEventTs = event.event_ts;
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
        botInfo.socketClient.on('message', async ({ event }) => {
          debug(`Socket event received for DM: ${JSON.stringify(event)}`);
          if (event.channel_type !== 'im' || !event.text || event.subtype === 'bot_message' || event.user === botInfo.botUserId) {
            debug('DM event filtered out');
            return;
          }
          if (event.event_ts === this.lastEventTs) {
            debug('Duplicate DM event ignored:', event.event_ts);
            return;
          }
          debug(`${botInfo.botUserName} received DM: ${event.text}`);
          if (this.messageHandler) {
            const slackMessage = new SlackMessage(event.text, event.channel, event);
            await this.messageHandler(slackMessage, []);
          }
          this.lastEventTs = event.event_ts;
        });
        if (botInfo !== primaryBot) {
          try {
            debug(`Starting DM socket client for ${botInfo.botUserName}`);
            await botInfo.socketClient.start();
            debug(`DM listener started for ${botInfo.botUserName}`);
          } catch (error) {
            debug(`Failed to start DM socket client for ${botInfo.botUserName}:`, error);
            throw error;
          }
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
    return this.slackBots.find(bot => bot.botUserName?.toLowerCase() === name.toLowerCase()) || this.slackBots[0];
  }

  public getAllBots(): SlackBotInfo[] {
    debug('Entering getAllBots');
    return this.slackBots;
  }

  public async handleMessage(message: IMessage, history: IMessage[] = []): Promise<string> {
    debug('Entering handleMessage');
    if (this.messageHandler) {
      debug('Invoking messageHandler');
      return await this.messageHandler(message, history);
    }
    debug('No message handler set');
    return '';
  }
}