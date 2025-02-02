import { WebClient } from '@slack/web-api';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import SlackMessage from './SlackMessage';
import slackConfig from './interfaces/slackConfig';

const debug = Debug('app:SlackService');

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private slackClient: WebClient;
  private botUserId: string | null = null;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  private constructor() {
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN is not set.');
    }
    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  public static getInstance(): SlackService {
    if (process.env.NODE_ENV === 'test') {
      return new SlackService();
    }
    if (!SlackService.instance) {
      SlackService.instance = new SlackService();
    }
    return SlackService.instance;
  }

  public static resetInstance(): void {
    SlackService.instance = undefined;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  public async sendMessage(channel: string, text: string): Promise<void> {
    await this.sendMessageToChannel(channel, text);
  }

  public async fetchMessages(channel: string): Promise<IMessage[]> {
    return this.getMessagesFromChannel(channel);
  }

  public async sendMessageToChannel(channel: string, message: string): Promise<void> {
    try {
      await this.slackClient.chat.postMessage({ channel, text: message });
      debug('[Slack] Message sent to #' + channel);
    } catch (error: any) {
      console.error('[Slack] Failed to send message to #' + channel + ':', error);
      throw new Error('[Slack] Failed to send message: ' + error.message);
    }
  }

  public async getMessagesFromChannel(channel: string, limit: number = 10): Promise<IMessage[]> {
    try {
      const result = await this.slackClient.conversations.history({ channel, limit });
      return result.messages?.map((msg) => new SlackMessage(msg.text || '', channel, msg)) || [];
    } catch (error: any) {
      console.error('[Slack] Failed to fetch messages from #' + channel + ': ' + error.message);
      throw new Error('[Slack] Failed to fetch messages: ' + error.message);
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    try {
      await this.slackClient.conversations.join({ channel });
      debug('[Slack] Joined channel: #' + channel);
      await this.sendWelcomeMessage(channel);
    } catch (error: any) {
      console.error('[Slack] Failed to join channel: ' + channel + ' - ' + error.message);
    }
  }

  public async joinConfiguredChannels(): Promise<void> {
    const channels = process.env.SLACK_JOIN_CHANNELS;
    if (!channels) {
      debug('[Slack] No channels specified to join.');
      return;
    }

    const channelList = channels.split(',').map(channel => channel.trim());

    for (const channel of channelList) {
      try {
        await this.joinChannel(channel);
        debug('[Slack] Successfully joined #' + channel);
      } catch (error) {
        console.warn('[Slack] Could not join #' + channel);
      }
    }
  }

  public async sendPublicAnnouncement(channel: string, announcement: any): Promise<void> {
    try {
      await this.slackClient.chat.postMessage({ channel, text: announcement });
      debug('[Slack] Public announcement sent to #' + channel);
    } catch (error: any) {
      console.error('[Slack] Failed to send announcement: ' + error.message);
    }
  }

  public getClientId(): string {
    return this.botUserId || '';
  }

  public getDefaultChannel(): string {
    return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
  }

  public async sendWelcomeMessage(channel: string): Promise<void> {
    try {
      const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Welcome to the channel! Click the button below for help getting started."
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Getting Started"
              },
              "value": "getting_started",
              "action_id": "getting_started"
            }
          ]
        }
      ];
      
      await this.slackClient.chat.postMessage({
        channel,
        text: "Welcome to the channel! Click the button below for help getting started.",
        blocks
      });
      debug('[Slack] Sent welcome message to channel ' + channel);
    } catch (error: any) {
      console.error('[Slack] Failed to send welcome message: ' + error.message);
    }
  }

  public async shutdown(): Promise<void> {
    debug('[Slack] Shutting down SlackService...');
    SlackService.instance = undefined;
  }
}
