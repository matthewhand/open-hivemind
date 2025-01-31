import { WebClient } from '@slack/web-api';
import Debug from 'debug';

const debug = Debug('app:SlackService');

export class SlackService {
  private static instance: SlackService | undefined;
  private slackClient: WebClient;

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

  // For testing purposes, allow resetting the instance.
  public static resetInstance(): void {
    SlackService.instance = undefined;
  }

  /**
   * Sends a message to a Slack channel.
   */
  public async sendMessage(channel: string, text: string): Promise<void> {
    try {
      await this.slackClient.chat.postMessage({ channel, text });
      debug(`[Slack] Message sent to #${channel}`);
    } catch (error) {
      console.error(`[Slack] Failed to send message to #${channel}:`, error);
      throw new Error(`[Slack] Failed to send message: ${error}`);
    }
  }

  /**
   * Fetches messages from a Slack channel.
   */
  public async fetchMessages(channel: string): Promise<{ text?: string }[]> {
    try {
      const result = await this.slackClient.conversations.history({ channel });
      return result.messages?.map((msg) => ({ text: msg.text })) || [];
    } catch (error) {
      console.error(`[Slack] Failed to fetch messages from #${channel}:`, error);
      throw new Error(`[Slack] Failed to fetch messages: ${error}`);
    }
  }

  /**
   * Joins the configured Slack channels based on `SLACK_JOIN_CHANNELS`
   */
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
        debug(`[Slack] Successfully joined #${channel}`);
      } catch (error) {
        console.warn(`[Slack] Could not join #${channel}`);
      }
    }
  }

  /**
   * Joins a Slack channel.
   * @param channel The name of the channel to join.
   */
  public async joinChannel(channel: string): Promise<void> {
    try {
      await this.slackClient.conversations.join({ channel });
      debug(`[Slack] Joined channel: #${channel}`);
    } catch (error) {
      throw new Error(`[Slack] Failed to join channel: ${channel} - ${error}`);
    }
  }
}
