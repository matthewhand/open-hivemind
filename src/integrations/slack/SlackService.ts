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
import { SlackSignatureVerifier } from './SlackSignatureVerifier';

// Interactive handling
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { InteractiveActionHandlers } from './InteractiveActionHandlers';

const debug = Debug('app:SlackService');

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

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private slackBots: SlackBotInfo[] = [];
  private mode: 'socket' | 'rtm';

  // IMessengerService still expects a handler with (message, historyMessages)
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => Promise<string>) | null = null;

  private signatureVerifier: SlackSignatureVerifier;
  private interactiveHandler: SlackInteractiveHandler;

  // For queue-based event processing:
  private eventQueue: { event: any; res: Response }[] = [];
  private isProcessingQueue = false;
  private lastEventTs: string | null = null;

  // Read configuration option to include history (off by default)
  private includeHistory: boolean = (slackConfig.get('SLACK_INCLUDE_HISTORY') === true);

  private constructor() {
    debug('[Slack] Initializing SlackService...');

    debug('[Slack] Environment Variables:');
    debug(redactSensitiveInfo('SLACK_BOT_TOKEN', process.env.SLACK_BOT_TOKEN || ''));
    debug(redactSensitiveInfo('SLACK_JOIN_CHANNELS', process.env.SLACK_JOIN_CHANNELS || ''));
    debug(redactSensitiveInfo('SLACK_DEFAULT_CHANNEL_ID', slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''));

    const botTokensStr = process.env.SLACK_BOT_TOKEN || '';
    const appTokensStr = process.env.SLACK_APP_TOKEN || '';
    const signingSecretsStr = process.env.SLACK_SIGNING_SECRET || '';

    const botTokens = botTokensStr.split(',').map((s) => s.trim()).filter(Boolean);
    const appTokens = appTokensStr.split(',').map((s) => s.trim()).filter(Boolean);
    const signingSecrets = signingSecretsStr.split(',').map((s) => s.trim()).filter(Boolean);

    if (botTokens.length === 0) {
      throw new Error('No valid SLACK_BOT_TOKEN found in environment');
    }
    if (signingSecrets.length < botTokens.length) {
      throw new Error('Not enough SLACK_SIGNING_SECRET entries to match all bot tokens');
    }

    this.mode = process.env.SLACK_MODE
      ? (process.env.SLACK_MODE.toLowerCase() as 'socket' | 'rtm')
      : 'socket';

    // Build SlackBotInfo list
    botTokens.forEach((botToken, index) => {
      const appToken = index < appTokens.length ? appTokens[index] : undefined;
      const signingSecret = index < signingSecrets.length ? signingSecrets[index] : signingSecrets[0];
      const webClient = new WebClient(botToken);

      const botInfo: SlackBotInfo = {
        botToken,
        appToken,
        signingSecret,
        webClient,
      };

      if (this.mode === 'socket' && appToken) {
        botInfo.socketClient = new SocketModeClient({ appToken });
      } else if (this.mode === 'rtm') {
        botInfo.rtmClient = new RTMClient(botToken);
      }

      this.slackBots.push(botInfo);
      debug(
        `[Slack] Created SlackBotInfo #${index} with mode=${this.mode}. BOT token: ${redactSensitiveInfo(
          'token',
          botToken,
        )}`,
      );
    });

    debug('=== BOT INITIALIZATION DUMP ===');
    this.slackBots.forEach((bot, index) => {
      debug(
        `Bot[${index}]: botUserName=${bot.botUserName || 'Not set yet'}, botUserId=${
          bot.botUserId || 'Not set'
        }, mode=${this.mode}`,
      );
    });
    debug('=== END BOT INITIALIZATION DUMP ===');

    // Create SlackSignatureVerifier using first bot's signingSecret
    const mainSigningSecret = this.slackBots[0]?.signingSecret;
    if (!mainSigningSecret) {
      throw new Error('No Slack signing secret found in SlackService constructor');
    }
    this.signatureVerifier = new SlackSignatureVerifier(mainSigningSecret);

    // Create InteractiveActionHandlers object delegating back to SlackService's placeholder methods
    const interactiveHandlers: InteractiveActionHandlers = {
      sendCourseInfo: async (channel: string) => {
        await this.sendCourseInfo(channel);
      },
      sendBookingInstructions: async (channel: string) => {
        await this.sendBookingInstructions(channel);
      },
      sendStudyResources: async (channel: string) => {
        await this.sendStudyResources(channel);
      },
      sendAskQuestionModal: async (triggerId: string) => {
        await this.sendAskQuestionModal(triggerId);
      },
      sendInteractiveHelpMessage: async (defaultChannel: string, userId: string) => {
        const blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👋 *Hello <@${userId}>!* Welcome! How can I assist you?`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📚 See Course Info' },
                action_id: 'see_course_info',
                value: 'course_info',
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '📅 Book Office Hours' },
                action_id: 'book_office_hours',
                value: 'office_hours',
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📖 Get Study Resources' },
                action_id: 'get_study_resources',
                value: 'study_resources',
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '❓ Ask a Question' },
                action_id: 'ask_question',
                value: 'ask_question',
              },
            ],
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💡 *Need more help?* Click a button above or type \`@university-bot help\` for a full list of commands.`,
            },
          },
        ];
        const defaultBot = this.slackBots[0];
        await defaultBot.webClient.chat.postMessage({
          channel: defaultChannel,
          text: 'Welcome! Here’s how you can interact with the University Bot.',
          blocks,
        });
      },
    };

    this.interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
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
      debug('[Slack] Initializing SlackService and registering routes...');

      // Slack interactive endpoint
      app.post(
        '/slack/interactive-endpoint',
        express.urlencoded({ extended: true }),
        (req: Request, res: Response, next: NextFunction) => this.signatureVerifier.verify(req, res, next),
        (req: Request, res: Response) => this.handleInteractiveRequest(req, res),
      );

      // Slack action endpoint
      app.get('/slack/action-endpoint', (req: Request, res: Response) => {
        if (req.query.challenge) {
          res.set('Content-Type', 'text/plain');
          res.status(200).send(String(req.query.challenge));
        } else {
          res.status(200).send('OK');
        }
      });
      app.post(
        '/slack/action-endpoint',
        express.urlencoded({ extended: true }),
        (req: Request, res: Response, next: NextFunction) => this.signatureVerifier.verify(req, res, next),
        this.handleActionRequest.bind(this),
      );

      // For each Slack bot, run auth.test, join channels, start listening.
      for (const botInfo of this.slackBots) {
        try {
          const authTest = await botInfo.webClient.auth.test();
          botInfo.botUserId = authTest.user_id;
          botInfo.botUserName = authTest.user;
          debug(`[Slack] Bot authenticated as: ${authTest.user} (ID: ${authTest.user_id})`);

          await this.joinConfiguredChannelsForBot(botInfo);
          await this.startListening(botInfo);
        } catch (error: any) {
          debug(`[Slack] Auth test failed for bot token: ${botInfo.botToken}. Error: ${error?.message}`);
        }
      }

      debug('[Slack] Initialization complete.');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Initialization error: ${errMsg}`);
    }
  }

  // Delegate interactive requests to SlackInteractiveHandler
  private async handleInteractiveRequest(req: Request, res: Response): Promise<void> {
    try {
      debug(`[Slack] Received interactive request with body: ${JSON.stringify(req.body)}`);
      const payload = JSON.parse(req.body.payload);
      debug(`[Slack] Parsed interactive payload: ${JSON.stringify(payload)}`);
      if (payload.type === 'block_actions') {
        await this.interactiveHandler.handleBlockAction(payload, res);
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
      res.status(200).json({ response_action: 'clear' });
      setImmediate(async () => {
        try {
          const userInput = payload.view?.state?.values?.user_input_block?.user_input?.value || '';
          debug(`[Slack] (Async) User submitted: ${userInput}`);
          const defaultBot = this.slackBots[0];
          const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL_ID;
          if (!defaultChannel) {
            debug('[Slack] SLACK_DEFAULT_CHANNEL_ID is not set, cannot send view submission response.');
            return;
          }
          const typingResponse = await defaultBot.webClient.chat.postMessage({
            channel: defaultChannel,
            text: '_Assistant is typing..._',
          });
          debug(`[Slack] (Async) Sent typing indicator, ts: ${typingResponse.ts}`);
          setTimeout(async () => {
            try {
              await defaultBot.webClient.chat.delete({
                channel: defaultChannel,
                ts: typingResponse.ts as string,
              });
              debug(`[Slack] (Async) Deleted typing indicator for user: ${payload.user.id}`);
            } catch (deleteError) {
              debug(`[Slack] (Async) Failed to delete typing indicator: ${deleteError}`);
            }
          }, 5000);

          // Call messageHandler with chat history if enabled; otherwise, pass empty array.
          if (this.messageHandler) {
            let history: IMessage[] = [];
            if (this.includeHistory) {
              try {
                history = await this.fetchMessagesForBot(defaultBot, defaultChannel, 10);
              } catch (err) {
                debug(`[Slack] Failed to fetch chat history: ${err}`);
              }
            }
            await this.messageHandler(new SlackMessage(userInput, defaultChannel, payload), history);
          } else {
            debug(`[Slack] (Async) No message handler configured.`);
          }
        } catch (asyncError) {
          debug(`[Slack] (Async) Error processing view_submission: ${asyncError}`);
        }
      });
    } catch (error) {
      debug(`[Slack] Error handling view_submission: ${error}`);
      res.status(500).send('Internal Server Error');
    }
  }

  private async handleActionRequest(req: Request, res: Response): Promise<void> {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      if (body.type === 'url_verification' && body.challenge) {
        debug('[Slack] Received URL verification challenge.');
        res.set('Content-Type', 'text/plain');
        res.status(200).send(body.challenge);
        return;
      }
      if (body.payload) {
        const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body.payload;
        if (!payload || !payload.actions || !Array.isArray(payload.actions) || payload.actions.length === 0) {
          debug('[Slack] Invalid or empty interactive actions payload.');
          res.status(400).send('Invalid interactive payload');
          return;
        }
        const action = payload.actions[0];
        const actionId = action.action_id;
        debug(`[Slack] Processing interactive action with ID: ${actionId}`);
        if (this.messageHandler) {
          const messageText = action.value || '';
          const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL_ID || payload.channel.id;
          const slackMessage = new SlackMessage(messageText, defaultChannel, payload);
          let history: IMessage[] = [];
          if (this.includeHistory) {
            try {
              history = await this.fetchMessagesForBot(this.slackBots[0], defaultChannel, 10);
            } catch (err) {
              debug(`[Slack] Failed to fetch chat history: ${err}`);
            }
          }
          await this.messageHandler(slackMessage, history);
        } else {
          debug('[Slack] No message handler configured.');
        }
        res.status(200).send('Interactive action handled successfully.');
        return;
      }
      if (body.type === 'event_callback') {
        this.eventQueue.push({ event: body.event, res });
        this.processQueue();
        return;
      }
      debug('[Slack] Received unknown payload structure.');
      res.status(400).send('Unknown payload structure');
    } catch (error) {
      debug(`[Slack] Error handling action request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }
    this.isProcessingQueue = true;
    while (this.eventQueue.length > 0) {
      const { event, res } = this.eventQueue.shift()!;
      res.status(200).send(); // Respond immediately to Slack
      debug(`[Slack] Processing event: ${JSON.stringify(event)}`);

      if (event.subtype === 'bot_message') {
        debug('[Slack] Ignoring bot message.');
        continue;
      }
      if (event.event_ts && this.lastEventTs === event.event_ts) {
        debug(`[Slack] Duplicate event detected (event_ts: ${event.event_ts}). Ignoring.`);
        continue;
      }
      if (!event.text) {
        debug('[Slack] Ignoring message with empty text.');
        continue;
      }
      if (this.messageHandler) {
        const messageText = event.text || '';
        debug(`[Slack] Responding to query: ${messageText}`);
        const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL_ID || event.channel;
        const slackMessage = new SlackMessage(messageText, defaultChannel, event);
        let history: IMessage[] = [];
        if (this.includeHistory) {
          try {
            history = await this.fetchMessagesForBot(this.slackBots[0], defaultChannel, 10);
          } catch (err) {
            debug(`[Slack] Failed to fetch chat history: ${err}`);
          }
        }
        try {
          await this.messageHandler(slackMessage, history);
        } catch (handlerError) {
          debug(`[Slack] Error in message handler: ${handlerError}`);
        }
      }
      if (event.event_ts) {
        this.lastEventTs = event.event_ts;
      }
    }
    this.isProcessingQueue = false;
  }

  public async getMessagesFromChannel(channelId: string, limit?: number): Promise<IMessage[]> {
    const defaultBot = this.slackBots[0];
    return this.fetchMessagesForBot(defaultBot, channelId, limit);
  }

  private async fetchMessagesForBot(botInfo: SlackBotInfo, channel: string, limit = 10): Promise<IMessage[]> {
    debug(`[Slack] [${botInfo.botUserName}] Fetching last ${limit} messages from channel: #${channel}`);
    try {
      const result = await botInfo.webClient.conversations.history({ channel, limit });
      debug(`[Slack] [${botInfo.botUserName}] Received messages: ${JSON.stringify(result.messages)}`);
      const messages = result.messages || [];
      return messages.map((msg) => new SlackMessage(msg.text || '', channel, msg));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      debug(`[Slack] [${botInfo.botUserName}] Failed to fetch messages: ${errMsg}`);
      throw new Error(`[Slack] Failed to fetch messages: ${errMsg}`);
    }
  }

  public async startListening(botInfo: SlackBotInfo): Promise<void> {
    debug(`[Slack] Starting message listener for ${botInfo.botUserName}...`);
    if (this.mode === 'socket' && botInfo.socketClient) {
      botInfo.socketClient.on('message', async ({ event }: { event: any }) => {
        debug(`[Slack] [Socket] [${botInfo.botUserName}] Received message in #${event.channel}: ${event.text}`);
        if (!event.text || event.subtype === 'bot_message') {
          debug('[Slack] Ignoring bot message or empty text.');
          return;
        }
        if (this.messageHandler) {
          try {
            await this.messageHandler(new SlackMessage(event.text, event.channel, event), this.includeHistory
              ? await this.fetchMessagesForBot(botInfo, event.channel, 10)
              : []);
          } catch (err) {
            debug(`[Slack] [${botInfo.botUserName}] Error in messageHandler: ${err}`);
          }
        } else {
          debug('[Slack] No message handler set.');
        }
      });
      await botInfo.socketClient.start();
      debug(`[Slack] Socket Mode client started for ${botInfo.botUserName}.`);
    } else if (this.mode === 'rtm' && botInfo.rtmClient) {
      botInfo.rtmClient.on('message', async (message: any) => {
        debug(`[Slack] [RTM] [${botInfo.botUserName}] Received message: ${message.text}`);
        if (!message.text || message.subtype === 'bot_message') {
          debug('[Slack] Ignoring bot message or empty text.');
          return;
        }
        if (this.messageHandler) {
          try {
            await this.messageHandler(new SlackMessage(message.text, message.channel, message), this.includeHistory
              ? await this.fetchMessagesForBot(botInfo, message.channel, 10)
              : []);
          } catch (err) {
            debug(`[Slack] [${botInfo.botUserName}] Error in messageHandler: ${err}`);
          }
        } else {
          debug('[Slack] No message handler set.');
        }
      });
      await botInfo.rtmClient.start();
      debug(`[Slack] RTM client started for ${botInfo.botUserName}.`);
    } else {
      debug(`[Slack] No valid client configured for listening for bot: ${botInfo.botUserName}.`);
    }
  }

  public async sendMessageToChannel(channel: string, message: string, senderName = 'Assistant'): Promise<void> {
    try {
      debug(`[Slack] sendMessageToChannel() called with senderName: ${senderName}`);
      let botInfo = this.findBotByName(senderName);
      if (!botInfo) {
        debug(`[Slack] Could not find bot for ${senderName}, defaulting to first bot.`);
        botInfo = this.slackBots[0];
      }
      const displayName = botInfo.botUserName || senderName;
      debug(`=== MESSAGE HANDLER DEBUG ===`);
      debug(`Channel: ${channel}`);
      debug(`Sender (active agent): ${senderName}`);
      debug(`Selected Bot: ${displayName}`);
      debug(`=== END MESSAGE HANDLER DEBUG ===`);

      await botInfo.webClient.chat.postMessage({
        channel,
        text: message,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      });
      debug(`[Slack] Message sent successfully using ${displayName}.`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Slack] Failed to send message to #${channel}: ${errMsg}`);
    }
  }

  private findBotByName(agentName?: string): SlackBotInfo | undefined {
    debug(`findBotByName() called with agentName: ${agentName}`);
    if (!agentName) {
      debug('No agent name provided.');
      return undefined;
    }
    const overrideVar = process.env.SLACK_USERNAME_OVERRIDE;
    if (overrideVar) {
      const overrideList = overrideVar.split(',').map((s) => s.trim().toLowerCase());
      debug(`Override list from SLACK_USERNAME_OVERRIDE: ${JSON.stringify(overrideList)}`);
      const index = overrideList.indexOf(agentName.toLowerCase());
      debug(`Agent "${agentName}" found in override list at index: ${index}`);
      if (index >= 0 && index < this.slackBots.length) {
        debug(`[Slack] Using bot override: ${this.slackBots[index].botUserName} for agent: ${agentName}`);
        return this.slackBots[index];
      }
    }
    const matched = this.slackBots.find((bot) => bot.botUserName?.toLowerCase() === agentName.toLowerCase());
    if (matched) {
      debug(`[Slack] Matched bot ${matched.botUserName} to agent ${agentName}`);
      return matched;
    }
    debug(`[Slack] No override or direct match found for agent ${agentName}, defaulting to first bot.`);
    return this.slackBots[0];
  }

  public async fetchMessages(channel: string): Promise<IMessage[]> {
    const defaultBot = this.slackBots[0];
    return this.fetchMessagesForBot(defaultBot, channel);
  }

  public async joinConfiguredChannelsForBot(botInfo: SlackBotInfo): Promise<void> {
    const channels = process.env.SLACK_JOIN_CHANNELS;
    if (!channels) {
      debug('[Slack] No channels specified to join.');
      return;
    }
    const channelList = channels.split(',').map((ch) => ch.trim());
    debug(`[Slack] Channels for ${botInfo.botUserName || 'unknown'}: ${JSON.stringify(channelList)}`);
    for (const channel of channelList) {
      try {
        const result = await botInfo.webClient.conversations.join({ channel });
        debug(`[Slack] [${botInfo.botUserName}] Joined #${channel}: ${JSON.stringify(result)}`);
        await this.sendWelcomeMessageForBot(botInfo, channel);
      } catch (err) {
        debug(`[Slack] [${botInfo.botUserName}] Could not join #${channel}: ${err}`);
      }
    }
  }

  public async sendMessage(channel: string, text: string, senderName?: string): Promise<void> {
    await this.sendMessageToChannel(channel, text, senderName);
  }

  public async sendWelcomeMessage(channel: string): Promise<void> {
    for (const botInfo of this.slackBots) {
      await this.sendWelcomeMessageForBot(botInfo, channel);
    }
  }

  private async sendWelcomeMessageForBot(botInfo: SlackBotInfo, channel: string): Promise<void> {
    try {
      debug(`[Slack] [${botInfo.botUserName}] Sending welcome message to #${channel}`);
      let text: string;
      let blocks: any[] | undefined;
      if (botInfo === this.slackBots[0]) {
        text = 'Welcome to the channel! Click the button below for help getting started.';
        blocks = [
          {
            type: 'section',
            text: { type: 'mrkdwn', text },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Getting Started' },
                value: 'getting_started',
                action_id: 'getting_started',
              },
            ],
          },
        ];
      } else {
        text = `${botInfo.botUserName} reporting for duty.`;
      }
      await botInfo.webClient.chat.postMessage({
        channel,
        text,
        ...(blocks ? { blocks } : {}),
      });
      debug(`[Slack] [${botInfo.botUserName}] Sent welcome message to #${channel}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      debug(`[Slack] Failed to send welcome message: ${errMsg}`);
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    const defaultBot = this.slackBots[0];
    try {
      debug(`[Slack] Attempting to join channel: #${channel}`);
      const response = await defaultBot.webClient.conversations.join({ channel });
      debug(`[Slack] Joined channel response: ${JSON.stringify(response)}`);
      await this.sendWelcomeMessage(channel);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      debug(`[Slack] Failed to join #${channel}: ${errMsg}`);
    }
  }

  public async sendPublicAnnouncement(channel: string, announcement: any): Promise<void> {
    try {
      const defaultBot = this.slackBots[0];
      debug(`[Slack] [${defaultBot.botUserName}] Sending public announcement to #${channel}`);
      await defaultBot.webClient.chat.postMessage({ channel, text: announcement });
      debug(`[Slack] Public announcement sent to #${channel}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      debug(`[Slack] Failed to send announcement: ${errMsg}`);
    }
  }

  public getClientId(): string {
    return this.slackBots[0]?.botUserId || '';
  }

  public getDefaultChannel(): string {
    return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || '';
  }

  // setMessageHandler keeps the original interface
  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>): void {
    this.messageHandler = handler;
  }

  public async shutdown(): Promise<void> {
    debug('[Slack] Shutting down SlackService...');
    SlackService.instance = undefined;
  }

  // --- Placeholder button actions ---
  private async sendCourseInfo(userId: string): Promise<void> {
    const defaultBot = this.slackBots[0];
    await defaultBot.webClient.chat.postMessage({
      channel: userId,
      text: 'Course Info: Here are the details of your courses...',
    });
  }

  private async sendBookingInstructions(userId: string): Promise<void> {
    const defaultBot = this.slackBots[0];
    await defaultBot.webClient.chat.postMessage({
      channel: userId,
      text: 'Office Hours Booking: To book office hours, please follow these instructions...',
    });
  }

  private async sendStudyResources(userId: string): Promise<void> {
    const defaultBot = this.slackBots[0];
    await defaultBot.webClient.chat.postMessage({
      channel: userId,
      text: 'Study Resources: Here are some useful study materials...',
    });
  }

  private async sendAskQuestionModal(triggerId: string): Promise<void> {
    const defaultBot = this.slackBots[0];
    await defaultBot.webClient.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'ask_question_modal',
        title: { type: 'plain_text', text: 'Ask a Question' },
        submit: { type: 'plain_text', text: 'Submit' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'user_input_block',
            element: { type: 'plain_text_input', action_id: 'user_input' },
            label: { type: 'plain_text', text: 'Your Question' },
          },
        ],
      },
    });
  }
}

export default SlackService.getInstance();
