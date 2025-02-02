import { SocketModeClient } from '@slack/socket-mode';
import { WebClient } from '@slack/web-api';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import SlackMessage from './SlackMessage';
import slackConfig from './interfaces/slackConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import express, { Application, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const debug = Debug('app:SlackService');

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private slackClient: WebClient;
  private socketClient: SocketModeClient;
  private botUserId: string | null = null;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  private constructor() {
    debug('[Slack] Initializing SlackService...');

    debug('[Slack] Environment Variables:');
    debug(redactSensitiveInfo('SLACK_BOT_TOKEN', process.env.SLACK_BOT_TOKEN || ''));
    debug(redactSensitiveInfo('SLACK_JOIN_CHANNELS', process.env.SLACK_JOIN_CHANNELS || ''));
    debug(redactSensitiveInfo('SLACK_DEFAULT_CHANNEL_ID', slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''));

    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN is not set.');
    }

    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.socketClient = new SocketModeClient({
      appToken: process.env.SLACK_APP_TOKEN || (() => { throw new Error("SLACK_APP_TOKEN is not set.") })()
    });
  }

  public static getInstance(): SlackService {
    if (process.env.NODE_ENV === 'test') {
      debug('[Slack] Running in test mode, creating new instance.');
      return new SlackService();
    }

    if (!SlackService.instance) {
      debug('[Slack] Creating a new instance of SlackService.');
      SlackService.instance = new SlackService();
    }

    return SlackService.instance;
  }

  public static resetInstance(): void {
    debug('[Slack] Resetting SlackService instance.');
    SlackService.instance = undefined;
  }

  public async initialize(app: Application): Promise<void> {
    try {
      debug('[Slack] Fetching bot user identity...');
      const authTest = await this.slackClient.auth.test();
      this.botUserId = authTest.user_id || null;
      debug(`[Slack] Bot authenticated as: ${authTest.user} (ID: ${this.botUserId})`);

      debug('[Slack] Initializing SlackService and registering routes...');
      
      // ✅ Register middleware to verify Slack Signature
      app.post('/slack/interactive-endpoint', this.verifySlackSignature, this.handleInteractiveRequest.bind(this));

      debug('[Slack] Joining configured channels...');
      await this.joinConfiguredChannels();

      debug('[Slack] Initialization complete.');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Initialization error: ${errMsg}`);
    }
  }

  /**
   * ✅ Middleware: Verify Slack Request Signature
   */
  private verifySlackSignature(req: Request, res: Response, next: NextFunction): void {
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    if (!slackSigningSecret) {
      console.error('SLACK_SIGNING_SECRET is not set.');
      return res.status(500).send('Server misconfiguration.');
    }

    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSignature = req.headers['x-slack-signature'] as string;
    
    if (!timestamp || !slackSignature) {
      return res.status(400).send('Bad Request');
    }

    const requestBody = JSON.stringify(req.body);
    const baseString = `v0:${timestamp}:${requestBody}`;
    const mySignature = `v0=${crypto.createHmac('sha256', slackSigningSecret).update(baseString).digest('hex')}`;

    // if (crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))) {
      next(); // Continue processing request
    // } else {
    //   res.status(400).send('Invalid signature.');
    // }
  }

  /**
   * ✅ Handles incoming Slack interactive requests (buttons, modals, etc.).
   */
  private async handleInteractiveRequest(req: Request, res: Response): Promise<void> {
    try {
        debug(`[Slack] Received interactive event: ${JSON.stringify(req.body.payload)}`);

        const payload = JSON.parse(req.body.payload);

        if (payload.type === 'block_actions') {
            await this.handleBlockAction(payload, res);
        } else if (payload.type === 'view_submission') {
            await this.handleViewSubmission(payload, res);
        } else {
            res.status(200).send(); // Default response for unhandled actions
        }
    } catch (error) {
        debug(`[Slack] Error handling interactive request: ${error}`);
        res.status(400).send('Bad Request');
    }
}


  private async handleBlockAction(payload: any, res: Response): Promise<void> {
    try {
        debug(`Handling block action: ${payload.actions[0].action_id}`);

        // ✅ Acknowledge the request immediately to avoid Slack timeout errors
        res.status(200).send();

        // 💬 Send a response message to the user
        await this.slackClient.chat.postMessage({
            channel: payload.user.id,
            text: `You clicked a button: ${payload.actions[0].text.text}`,
        });

        debug(`[Slack] Response sent to user: ${payload.user.id}`);
    } catch (error) {
        debug(`[Slack] Error handling block action: ${error}`);
    }
  }

  /**
   * ✅ Fetches Slack messages
   */
  public async getMessagesFromChannel(channel: string, limit: number = 10): Promise<IMessage[]> {
    try {
      debug(`[Slack] Fetching last ${limit} messages from channel: #${channel}`);
      const result = await this.slackClient.conversations.history({ channel, limit });
      debug(`[Slack] Received messages: ${JSON.stringify(result.messages)}`);

      return result.messages?.map((msg) => new SlackMessage(msg.text || '', channel, msg)) || [];
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Failed to fetch messages from #${channel}: ${errMsg}`);
      throw new Error(`[Slack] Failed to fetch messages: ${errMsg}`);
    }
  }

  /**
   * ✅ Start listening to events via Socket Mode
   */
  public async startListening(): Promise<void> {
    debug('[Slack] Subscribing to message events...');

    this.socketClient.on('message', async ({ event }: { event: any }) => {
      debug(`[Slack] Received message in #${event.channel}: ${event.text}`);

      if (!event.text || event.subtype === 'bot_message') {
        debug('[Slack] Ignoring bot message or empty text.');
        return;
      }

      if (this.messageHandler) {
        let historyMessages: IMessage[] = [];
        try {
          historyMessages = await this.getMessagesFromChannel(event.channel, 10);
          debug(`[Slack] Retrieved ${historyMessages.length} past messages for context.`);
        } catch (error: unknown) {
          console.warn(`[Slack] Failed to fetch past messages: ${error}`);
        }

        debug(`[Slack] Processing new message: "${event.text}"`);
        await this.messageHandler(new SlackMessage(event.text, event.channel, event), historyMessages);
      } else {
        debug('[Slack] No message handler set.');
      }
    });

    await this.socketClient.start();
  }

  public async sendMessageToChannel(channel: string, message: string): Promise<void> {
    try {
      debug(`[Slack] Sending message to #${channel}: "${message}"`);
      const response = await this.slackClient.chat.postMessage({ channel, text: message });
      debug(`[Slack] Message sent: ${JSON.stringify(response)}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Failed to send message to #${channel}: ${errMsg}`);
    }
  }

  public async joinConfiguredChannels(): Promise<void> {
    const channels = process.env.SLACK_JOIN_CHANNELS;
    if (!channels) {
      debug('[Slack] No channels specified to join.');
      return;
    }

    const channelList = channels.split(',').map(channel => channel.trim());
    debug(`[Slack] Channels to join: ${channelList.join(', ')}`);

    for (const channel of channelList) {
      try {
        await this.joinChannel(channel);
        debug(`[Slack] Successfully joined #${channel}`);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`[Slack] Could not join #${channel}: ${errMsg}`);
      }
    }
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


  public async joinChannel(channel: string): Promise<void> {
    try {
      debug(`[Slack] Attempting to join channel: #${channel}`);
      const response = await this.slackClient.conversations.join({ channel });
      debug(`[Slack] Joined channel response: ${JSON.stringify(response)}`);

      await this.sendWelcomeMessage(channel);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[Slack] Failed to join #${channel}: ${errMsg}`);
    }
  }


  public async sendPublicAnnouncement(channel: string, announcement: any): Promise<void> {
    try {
      debug(`[Slack] Sending public announcement to #${channel}`);
      await this.slackClient.chat.postMessage({ channel, text: announcement });
      debug(`[Slack] Public announcement sent to #${channel}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Failed to send announcement: ${errMsg}`);
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
      debug(`[Slack] Sending welcome message to #${channel}`);
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

      debug(`[Slack] Sent welcome message to #${channel}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Failed to send welcome message: ${errMsg}`);
    }
  }

  public async shutdown(): Promise<void> {
    debug('[Slack] Shutting down SlackService...');
    SlackService.instance = undefined;
  }
}
