import { SocketModeClient } from '@slack/socket-mode';
import { RTMClient } from '@slack/rtm-api';
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
  private socketClient?: SocketModeClient;
  private rtmClient?: RTMClient;
  private mode: 'socket' | 'rtm';
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

    // Determine mode; default to 'socket'
    this.mode = process.env.SLACK_MODE ? process.env.SLACK_MODE.toLowerCase() as 'socket' | 'rtm' : 'socket';
    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

    if (this.mode === 'socket') {
      if (!process.env.SLACK_APP_TOKEN) {
        throw new Error('SLACK_APP_TOKEN is not set for socket mode.');
      }
      this.socketClient = new SocketModeClient({
        appToken: process.env.SLACK_APP_TOKEN
      });
      debug('[Slack] Configured for Socket Mode.');
    } else if (this.mode === 'rtm') {
      // Instantiate RTM client from @slack/rtm-api
      this.rtmClient = new RTMClient(process.env.SLACK_BOT_TOKEN);
      debug('[Slack] Configured for RTM Mode.');
    }
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
      app.post(
        '/slack/interactive-endpoint',
        this.verifySlackSignature.bind(this),
        this.handleInteractiveRequest.bind(this)
      );

      debug('[Slack] Joining configured channels...');
      await this.joinConfiguredChannels();

      debug('[Slack] Starting event listener...');
      await this.startListening();

      debug('[Slack] Initialization complete.');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Initialization error: ${errMsg}`);
    }
  }

  private verifySlackSignature(req: Request, res: Response, next: NextFunction): void {
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    if (!slackSigningSecret) {
      console.error('SLACK_SIGNING_SECRET is not set.');
      res.status(500).send('Server misconfiguration.');
      return;
    }
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSignature = req.headers['x-slack-signature'] as string;
    if (!timestamp || !slackSignature) {
      res.status(400).send('Bad Request');
      return;
    }
    const requestBody = JSON.stringify(req.body);
    const baseString = `v0:${timestamp}:${requestBody}`;
    const mySignature = `v0=${crypto.createHmac('sha256', slackSigningSecret).update(baseString).digest('hex')}`;
    // For production, compare signatures securely.
    next();
  }

  private async handleInteractiveRequest(req: Request, res: Response): Promise<void> {
    try {
      debug(`[Slack] Received interactive event: ${JSON.stringify(req.body.payload)}`);
      const payload = JSON.parse(req.body.payload);
      if (payload.type === 'block_actions') {
        await this.handleBlockAction(payload, res);
      } else if (payload.type === 'view_submission') {
        await this.handleViewSubmission(payload, res);
      } else {
        res.status(200).send();
      }
    } catch (error) {
      debug(`[Slack] Error handling interactive request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  private async handleViewSubmission(payload: any, res: Response): Promise<void> {
    try {
      debug(`[Slack] Handling modal submission: ${JSON.stringify(payload.view.state.values)}`);
      const submittedValues = payload.view.state.values;
      const userInput = submittedValues?.user_input_block?.user_input?.value || ''; // No content generated
      debug(`[Slack] User submitted: ${userInput}`);
      if (this.messageHandler) {
        const historyMessages: IMessage[] = [];
        const messageObj = new SlackMessage(userInput, payload.user.id, payload);
        await this.messageHandler(messageObj, historyMessages);
      } else {
        await this.slackClient.chat.postMessage({
          channel: payload.user.id,
          text: "No message handler configured."
        });
      }
      res.status(200).json({ response_action: 'clear' });
    } catch (error) {
      debug(`[Slack] Error handling view_submission: ${error}`);
      res.status(500).send('Internal Server Error');
    }
  }

  private async handleBlockAction(payload: any, res: Response): Promise<void> {
    try {
      const actionId = payload.actions[0].action_id;
      debug(`Handling block action: ${actionId}`);
      res.status(200).send();
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `👋 *Hello <@${payload.user.id}>!* Welcome to the University Bot. How can I assist you?`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "📚 See Course Info" },
              action_id: "see_course_info",
              value: "course_info"
            },
            {
              type: "button",
              text: { type: "plain_text", text: "📅 Book Office Hours" },
              action_id: "book_office_hours",
              value: "office_hours"
            }
          ]
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "📖 Get Study Resources" },
              action_id: "get_study_resources",
              value: "study_resources"
            },
            {
              type: "button",
              text: { type: "plain_text", text: "❓ Ask a Question" },
              action_id: "ask_question",
              value: "ask_question"
            }
          ]
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `💡 *Need more help?* Click a button above or type \`@university-bot help\` for a full list of commands.`
          }
        }
      ];
      await this.slackClient.chat.postMessage({
        channel: payload.user.id,
        text: "Welcome! Here’s how you can interact with the University Bot.",
        blocks: blocks
      });
      debug(`[Slack] Sent interactive help message to user: ${payload.user.id}`);
      switch (actionId) {
        case "see_course_info":
          await this.sendCourseInfo(payload.user.id);
          break;
        case "book_office_hours":
          await this.sendBookingInstructions(payload.user.id);
          break;
        case "get_study_resources":
          await this.sendStudyResources(payload.user.id);
          break;
        case "ask_question":
          await this.sendAskQuestionModal(payload.trigger_id);
          break;
        default:
          debug(`Unhandled action: ${actionId}`);
      }
    } catch (error) {
      debug(`[Slack] Error handling block action: ${error}`);
    }
  }

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

  public async startListening(): Promise<void> {
    debug('[Slack] Starting message listener...');
    if (this.mode === 'socket' && this.socketClient) {
      this.socketClient.on('message', async ({ event }: { event: any }) => {
        debug(`[Slack] [Socket] Received message in #${event.channel}: ${event.text}`);
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
          await this.messageHandler(new SlackMessage(event.text, event.channel, event), historyMessages);
        } else {
          debug('[Slack] No message handler set.');
        }
      });
      await this.socketClient.start();
      debug('[Slack] Socket Mode client started.');
    } else if (this.mode === 'rtm' && this.rtmClient) {
      // RTM message event handling
      this.rtmClient.on('message', async (message: any) => {
        debug(`[Slack] [RTM] Received message: ${message.text}`);
        // Adjust according to RTM message structure:
        if (!message.text || message.subtype === 'bot_message') {
          debug('[Slack] Ignoring bot message or empty text.');
          return;
        }
        if (this.messageHandler) {
          // For RTM, the channel is message.channel
          let historyMessages: IMessage[] = [];
          try {
            historyMessages = await this.getMessagesFromChannel(message.channel, 10);
            debug(`[Slack] Retrieved ${historyMessages.length} past messages for context.`);
          } catch (error: unknown) {
            console.warn(`[Slack] Failed to fetch past messages: ${error}`);
          }
          await this.messageHandler(new SlackMessage(message.text, message.channel, message), historyMessages);
        } else {
          debug('[Slack] No message handler set.');
        }
      });
      await this.rtmClient.start();
      debug('[Slack] RTM client started.');
    } else {
      debug('[Slack] No valid client configured for listening.');
    }
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
          type: "section",
          text: { type: "mrkdwn", text: "Welcome to the channel! Click the button below for help getting started." }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Getting Started" },
              value: "getting_started",
              action_id: "getting_started"
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

  // Placeholder button actions

  private async sendCourseInfo(userId: string): Promise<void> {
    await this.slackClient.chat.postMessage({
      channel: userId,
      text: "Course Info: Here are the details of your courses..."
    });
  }

  private async sendBookingInstructions(userId: string): Promise<void> {
    await this.slackClient.chat.postMessage({
      channel: userId,
      text: "Office Hours Booking: To book office hours, please follow these instructions..."
    });
  }

  private async sendStudyResources(userId: string): Promise<void> {
    await this.slackClient.chat.postMessage({
      channel: userId,
      text: "Study Resources: Here are some useful study materials..."
    });
  }

  private async sendAskQuestionModal(triggerId: string): Promise<void> {
    await this.slackClient.views.open({
      trigger_id: triggerId,
      view: {
        type: "modal",
        callback_id: "ask_question_modal",
        title: { type: "plain_text", text: "Ask a Question" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "input",
            block_id: "user_input_block",
            element: { type: "plain_text_input", action_id: "user_input" },
            label: { type: "plain_text", text: "Your Question" }
          }
        ]
      }
    });
  }
}
