import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';
import { WebClient } from '@slack/web-api';
import Debug from 'debug';
import { SlackMessage } from './SlackMessage';
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
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => Promise<string>) | null = null;
  private includeHistory: boolean = process.env.SLACK_INCLUDE_HISTORY === 'true';
  private lastEventTs: string | null = null;

  constructor(botTokens: string[], appTokens: string[], signingSecrets: string[], mode: 'socket' | 'rtm') {
    this.mode = mode;
    botTokens.forEach((botToken, index) => {
      const appToken = index < appTokens.length ? appTokens[index] : undefined;
      const signingSecret = index < signingSecrets.length ? signingSecrets[index] : signingSecrets[0];
      const webClient = new WebClient(botToken);
      const botInfo: SlackBotInfo = { botToken, appToken, signingSecret, webClient };
      if (this.mode === 'socket' && appToken) botInfo.socketClient = new SocketModeClient({ appToken });
      else if (this.mode === 'rtm') botInfo.rtmClient = new RTMClient(botToken);
      this.slackBots.push(botInfo);
      debug(`Created bot #${index}: ${botInfo.botUserName || botToken.substring(0, 8)}...`);
    });
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    this.messageHandler = handler;
  }

  public async initialize() {
    for (const botInfo of this.slackBots) {
      const authTest = await botInfo.webClient.auth.test();
      botInfo.botUserId = authTest.user_id;
      botInfo.botUserName = authTest.user;
      debug(`Bot authenticated: ${botInfo.botUserName} (${botInfo.botUserId})`);
    }
    await this.startListening();
  }

  private async startListening() {
    const primaryBot = this.slackBots[0]; // Primary bot for channels
    const allBotUserIds = this.slackBots.map(b => b.botUserId).filter(Boolean) as string[];

    // Primary bot listens on channels
    if (this.mode === 'socket' && primaryBot.socketClient) {
      primaryBot.socketClient.on('message', async ({ event }) => {
        if (!event.text || event.subtype === 'bot_message' || allBotUserIds.includes(event.user)) return;
        if (event.event_ts === this.lastEventTs) return; // Resubmission check
        debug(`Primary bot received channel message: ${event.text}`);
        if (this.messageHandler) {
          const slackMessage = new SlackMessage(event.text, event.channel, event);
          const history = this.includeHistory ? await this.fetchMessagesForBot(primaryBot, event.channel, 10) : [];
          await this.messageHandler(slackMessage, history);
        }
        this.lastEventTs = event.event_ts;
      });
      await primaryBot.socketClient.start();
      debug('Primary socket client started for channels');
    }

    // All bots listen for DMs
    for (const botInfo of this.slackBots) {
      if (this.mode === 'socket' && botInfo.socketClient) {
        botInfo.socketClient.on('message', async ({ event }) => {
          if (event.channel_type !== 'im' || !event.text || event.subtype === 'bot_message' || event.user === botInfo.botUserId) return;
          if (event.event_ts === this.lastEventTs) return;
          debug(`${botInfo.botUserName} received DM: ${event.text}`);
          if (this.messageHandler) {
            const slackMessage = new SlackMessage(event.text, event.channel, event);
            await this.messageHandler(slackMessage, []); // No history for DMs
          }
          this.lastEventTs = event.event_ts;
        });
        if (botInfo !== primaryBot) await botInfo.socketClient.start(); // Start secondary bots
        debug(`DM listener started for ${botInfo.botUserName}`);
      }
    }
  }

  private async fetchMessagesForBot(botInfo: SlackBotInfo, channel: string, limit = 10): Promise<IMessage[]> {
    const result = await botInfo.webClient.conversations.history({ channel, limit });
    return (result.messages || []).map(msg => new SlackMessage(msg.text || '', channel, msg));
  }

  public getBotByName(name: string): SlackBotInfo | undefined {
    return this.slackBots.find(bot => bot.botUserName?.toLowerCase() === name.toLowerCase()) || this.slackBots[0];
  }

  public getAllBots(): SlackBotInfo[] {
    return this.slackBots;
  }
}
