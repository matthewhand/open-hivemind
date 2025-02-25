import { Application } from 'express';
import express from 'express';
import Debug from 'debug';
import axios from 'axios';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackBotManager } from './SlackBotManager';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';
import { SlackInteractiveHandler } from './SlackInteractiveHandler';
import { InteractiveActionHandlers } from './InteractiveActionHandlers';
import slackConfig from '@src/config/slackConfig';
import messageConfig from '@src/config/messageConfig';
import { SlackInteractiveActions } from './SlackInteractiveActions';
import SlackMessage from './SlackMessage';
import { getLlmProvider } from '@src/llm/getLlmProvider';

const debug = Debug('app:SlackService');

interface SlackUserInfo {
  user?: {
    name?: string;
    profile?: {
      email?: string;
      real_name?: string;
    };
    is_admin?: boolean;
    is_owner?: boolean;
  };
}

export class SlackService implements IMessengerService {
  private static instance: SlackService | undefined;
  private botManager: SlackBotManager;
  private signatureVerifier: SlackSignatureVerifier;
  private interactiveHandler: SlackInteractiveHandler;
  private interactiveActions: SlackInteractiveActions;
  private lastEventTs: string | null = null;
  private lastSentTs: string | null = null;
  private app?: Application;

  private constructor() {
    const botTokens = process.env.SLACK_BOT_TOKEN?.split(',').map(s => s.trim()) || [];
    const appTokens = process.env.SLACK_APP_TOKEN?.split(',').map(s => s.trim()) || [];
    const signingSecrets = process.env.SLACK_SIGNING_SECRET?.split(',').map(s => s.trim()) || [];
    const mode = process.env.SLACK_MODE === 'rtm' ? 'rtm' : 'socket';
    this.botManager = new SlackBotManager(botTokens, appTokens, signingSecrets, mode);
    this.signatureVerifier = new SlackSignatureVerifier(signingSecrets[0]);
    this.interactiveActions = new SlackInteractiveActions(this);
    const interactiveHandlers: InteractiveActionHandlers = {
      sendCourseInfo: async (channel) => this.interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel) => this.interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel) => this.interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId) => this.interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel, userId) => this.interactiveActions.sendInteractiveHelpMessage(channel, userId),
    };
    this.interactiveHandler = new SlackInteractiveHandler(interactiveHandlers);
  }

  public static getInstance(): SlackService {
    if (!SlackService.instance) SlackService.instance = new SlackService();
    return SlackService.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.app) {
      debug('Express app not set; call setApp() before initialize() for Slack routing');
      return;
    }
    this.app.post('/slack/action-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      this.handleActionRequest.bind(this)
    );
    this.app.post('/slack/interactive-endpoint',
      express.urlencoded({ extended: true }),
      (req, res, next) => this.signatureVerifier.verify(req, res, next),
      (req, res) => this.interactiveHandler.handleRequest(req, res)
    );
    await this.botManager.initialize();
    for (const botInfo of this.botManager.getAllBots()) {
      await this.joinConfiguredChannelsForBot(botInfo);
    }
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    this.botManager.setMessageHandler(async (message, history) => {
      const enrichedMessage = await this.enrichSlackMessage(message);
      const metadata = enrichedMessage.data;
      const llmProvider = getLlmProvider()[0];
      const response = await llmProvider.generateChatCompletion(enrichedMessage.getText(), history, metadata);
      debug('LLM Response:', response);
      const channelId = enrichedMessage.getChannelId();
      const threadTs = enrichedMessage.data.thread_ts;
      await this.sendMessageToChannel(channelId, response, undefined, threadTs);
      return response;
    });
  }

  private async enrichSlackMessage(message: SlackMessage): Promise<SlackMessage> {
    const botInfo = this.botManager.getAllBots()[0];
    const channelId = message.getChannelId();
    const userId = message.getAuthorId();
    const threadTs = message.data.thread_ts;
    const suppressCanvasContent = process.env.SUPPRESS_CANVAS_CONTENT === 'true';

    try {
      // Workspace info
      const authInfo = await botInfo.webClient.auth.test();
      const workspaceInfo = { workspaceId: authInfo.team_id, workspaceName: authInfo.team };

      // Channel info
      const channelInfoResp = await botInfo.webClient.conversations.info({ channel: channelId });
      const channelInfo = {
        channelId,
        channelName: channelInfoResp.channel?.name,
        description: channelInfoResp.channel?.purpose?.value,
        createdDate: channelInfoResp.channel?.created ? new Date(channelInfoResp.channel.created * 1000).toISOString() : undefined
      };

      // Thread info
      const threadInfo = {
        isThread: !!threadTs,
        threadTs,
        threadOwnerUserId: threadTs ? message.data.user : undefined,
        threadParticipants: threadTs ? await this.getThreadParticipants(channelId, threadTs) : [],
        messageCount: threadTs ? await this.getThreadMessageCount(channelId, threadTs) : 0
      };

      // User info
      const userInfo: SlackUserInfo = userId && userId !== 'unknown' ? await botInfo.webClient.users.info({ user: userId }) : {};
      const slackUser = {
        slackUserId: userId,
        userName: userInfo.user?.name || 'Unknown',
        email: userInfo.user?.profile?.email,
        preferredName: userInfo.user?.profile?.real_name,
        isStaff: userInfo.user?.is_admin || userInfo.user?.is_owner || false
      };

      // Canvas content
      let canvas = message.data.canvas ? { ...message.data.canvas } : undefined;
      if (!suppressCanvasContent) {
        try {
          // Fetch all canvases in the channel
          const listResponse = await botInfo.webClient.files.list({
            types: 'canvas',
            channel: channelId
          });
          debug('files.list response:', JSON.stringify(listResponse, null, 2));

          if (listResponse.ok && listResponse.files?.length) {
            // Find the channel canvas
            const targetCanvas = listResponse.files.find(f => f.linked_channel_id === channelId) || listResponse.files[0];
            debug('Selected canvas from files.list:', targetCanvas?.id, targetCanvas?.url_private);

            if (targetCanvas && targetCanvas.id) {
              const canvasInfo = await botInfo.webClient.files.info({ file: targetCanvas.id });
              debug('files.info response:', JSON.stringify(canvasInfo, null, 2));
              if (canvasInfo.ok) {
                debug('Canvas content field:', canvasInfo.content || 'Not present');
                if (canvasInfo.file?.filetype === 'canvas' || canvasInfo.file?.filetype === 'quip') {
                  canvas = {
                    ...targetCanvas,
                    content: canvasInfo.content || 'No content returned by API',
                    info: canvasInfo.file
                  };
                  // If no content, try fetching from url_private as a fallback
                  if (!canvasInfo.content && canvasInfo.file?.url_private) {
                    try {
                      const contentResponse = await axios.get(canvasInfo.file.url_private, {
                        headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` }
                      });
                      canvas.content = contentResponse.data || 'Failed to fetch content from URL';
                      debug('Fetched content from url_private:', canvas.content.substring(0, 50) + '...');
                    } catch (fetchError) {
                      debug('Failed to fetch content from url_private:', fetchError);
                      canvas.content = 'Failed to fetch content from URL';
                    }
                  }
                } else if (canvasInfo.file && ['png', 'jpg', 'jpeg', 'gif'].includes(canvasInfo.file.filetype || '')) {
                  const fileResponse = await axios.get(canvasInfo.file.url_private!, {
                    headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                    responseType: 'arraybuffer'
                  });
                  const base64Content = Buffer.from(fileResponse.data).toString('base64');
                  canvas = {
                    ...targetCanvas,
                    content: `data:${canvasInfo.file.mimetype};base64,${base64Content}`,
                    info: canvasInfo.file
                  };
                  debug('Binary canvas content base64-encoded:', canvas.content.substring(0, 50) + '...');
                } else {
                  throw new Error('Unsupported file type: ' + (canvasInfo.file?.filetype || 'unknown'));
                }
              } else {
                throw new Error(canvasInfo.error || 'Unknown error fetching canvas info');
              }
              debug('Canvas content retrieved:', canvas.content);
            } else {
              debug('No valid canvas found in files.list');
            }
          } else {
            debug('No canvases found in files.list for channel:', channelId);
            canvas = { contentUrl: process.env.SLACK_CANVAS_URL || 'https://une-n70.slack.com/canvas/C07GNG6MAV9' };
            const fallbackId = `F${canvas.contentUrl.split('/').pop()}`;
            const canvasInfo = await botInfo.webClient.files.info({ file: fallbackId });
            debug('Fallback files.info response:', JSON.stringify(canvasInfo, null, 2));
            if (canvasInfo.ok) {
              if (canvasInfo.file?.filetype === 'canvas' || canvasInfo.file?.filetype === 'quip') {
                canvas = {
                  ...canvas,
                  content: canvasInfo.content || 'No content returned by API',
                  info: canvasInfo.file
                };
              } else if (canvasInfo.file && ['png', 'jpg', 'jpeg', 'gif'].includes(canvasInfo.file.filetype || '')) {
                const fileResponse = await axios.get(canvasInfo.file.url_private!, {
                  headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                  responseType: 'arraybuffer'
                });
                const base64Content = Buffer.from(fileResponse.data).toString('base64');
                canvas = {
                  ...canvas,
                  content: `data:${canvasInfo.file.mimetype};base64,${base64Content}`,
                  info: canvasInfo.file
                };
                debug('Fallback binary canvas content base64-encoded:', canvas.content.substring(0, 50) + '...');
              } else {
                canvas.content = 'Fallback canvas not found';
                debug('Fallback canvas fetch failed:', canvasInfo.error || 'Unknown error');
              }
            } else {
              canvas.content = 'Fallback canvas fetch failed';
              debug('Fallback canvas fetch failed:', canvasInfo.error || 'Unknown error');
            }
          }
        } catch (error) {
          debug(`Failed to retrieve Canvas content: ${error}`);
          canvas = canvas || { contentUrl: process.env.SLACK_CANVAS_URL || 'https://une-n70.slack.com/canvas/C07GNG6MAV9' };
          canvas.content = 'Error retrieving content';
        }
      }

      const messageAttachments = message.data.files?.map((file: any, index: number) => ({
        id: index + 9999,
        fileName: file.name,
        fileType: file.filetype,
        url: file.url_private,
        size: file.size
      })) || [];

      const messageReactions = message.data.reactions?.map((reaction: any) => ({
        reaction: reaction.name,
        reactedUserId: reaction.users[0],
        messageId: message.getMessageId(),
        messageChannelId: channelId
      })) || [];

      message.data = {
        ...message.data,
        workspaceInfo,
        channelInfo,
        threadInfo,
        slackUser,
        canvas,
        messageAttachments,
        messageReactions
      };
      debug('Enriched Message Data:', JSON.stringify(message.data, null, 2));
    } catch (error) {
      debug(`Failed to enrich message: ${error}`);
    }

    return message;
  }

  private async getThreadParticipants(channelId: string, threadTs: string): Promise<string[]> {
    const botInfo = this.botManager.getAllBots()[0];
    const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
    return [...new Set(replies.messages?.map(m => m.user).filter(Boolean) as string[])];
  }

  private async getThreadMessageCount(channelId: string, threadTs: string): Promise<number> {
    const botInfo = this.botManager.getAllBots()[0];
    const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
    return replies.messages?.length || 0;
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const effectiveSender = senderName || displayName;
    const botInfo = this.botManager.getBotByName(effectiveSender) || this.botManager.getAllBots()[0];
    if (this.lastSentTs === threadId || this.lastSentTs === Date.now().toString()) {
      debug(`Duplicate message TS: ${threadId || this.lastSentTs}, skipping`);
      return '';
    }
    try {
      const options: any = {
        channel: channelId,
        text: `*${effectiveSender}*: ${text}`,
        username: effectiveSender,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      };
      if (threadId) options.thread_ts = threadId;
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''} as ${effectiveSender}`);
      this.lastSentTs = result.ts || Date.now().toString();
      return result.ts || '';
    } catch (error) {
      debug(`Failed to send message: ${error}`);
      return '';
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId);
  }

  public async fetchMessages(channelId: string): Promise<IMessage[]> {
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const result = await botInfo.webClient.conversations.history({ channel: channelId, limit: 10 });
      return (result.messages || []).map(msg => new SlackMessage(msg.text || '', channelId, msg));
    } catch (error) {
      debug(`Failed to fetch messages: ${error}`);
      return [];
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text = typeof announcement === 'string' ? announcement : announcement.message || 'Announcement';
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channelId, text, displayName);
  }

  private async handleActionRequest(req: express.Request, res: express.Response) {
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
        res.status(200).send();
        return;
      }
      res.status(400).send('Bad Request');
    } catch (error) {
      debug(`Error handling action request: ${error}`);
      res.status(400).send('Bad Request');
    }
  }

  private async joinConfiguredChannelsForBot(botInfo: any) {
    const channels = slackConfig.get('SLACK_JOIN_CHANNELS');
    if (!channels) return;
    const channelList = channels.split(',').map(ch => ch.trim());
    for (const channel of channelList) {
      try {
        await botInfo.webClient.conversations.join({ channel });
        debug(`Joined #${channel} for ${botInfo.botUserName}`);
        const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
        await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
      } catch (error) {
        debug(`Failed to join #${channel}: ${error}`);
      }
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    const botInfo = this.botManager.getAllBots()[0];
    await botInfo.webClient.conversations.join({ channel });
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
  }

  public async sendWelcomeMessage(channel: string): Promise<void> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    await this.sendMessageToChannel(channel, `Welcome from ${displayName}!`, displayName);
  }

  public getClientId(): string { return this.botManager.getAllBots()[0]?.botUserId || ''; }
  public getDefaultChannel(): string { return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''; }
  public async shutdown(): Promise<void> { SlackService.instance = undefined; }
  public getBotManager(): SlackBotManager { return this.botManager; }
}
