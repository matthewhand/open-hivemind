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
    } catch (error: any) {
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
   * Joins a Slack channel.
   * @param channel The name of the channel to join.
   */
  public async joinChannel(channel: string): Promise<void> {
    try {
      await this.slackClient.conversations.join({ channel });
      debug(`[Slack] Joined channel: #${channel}`);
      // Once joined, send the welcome message.
      await this.sendWelcomeMessage(channel);
    } catch (error) {
      throw new Error(`[Slack] Failed to join channel: ${channel} - ${error}`);
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
   * Sends a welcome message containing a "Getting Started" button to a Slack channel.
   * This message uses Slack’s Block Kit to present a rich UI.
   * @param channel The ID of the Slack channel.
   */
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
      debug(`[Slack] Sent welcome message to channel ${channel}`);
    } catch (error: any) {
      console.error(`[Slack] Failed to send welcome message: ${error.message}`);
    }
  }
}
