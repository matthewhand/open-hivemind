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
import { markdownToBlocks } from '@tryfabric/mack';
import { KnownBlock } from '@slack/web-api';

const debug = Debug('app:SlackService:verbose');

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
    const botTokens = slackConfig.get('SLACK_BOT_TOKEN').split(',').map(s => s.trim()) || [];
    const appTokens = slackConfig.get('SLACK_APP_TOKEN').split(',').map(s => s.trim()) || [];
    const signingSecrets = slackConfig.get('SLACK_SIGNING_SECRET').split(',').map(s => s.trim()) || [];
    const mode = slackConfig.get('SLACK_MODE') as 'socket' | 'rtm';
    this.botManager = new SlackBotManager(botTokens, appTokens, signingSecrets, mode);
    this.signatureVerifier = new SlackSignatureVerifier(signingSecrets[0]);
    this.interactiveActions = new SlackInteractiveActions(this);
    const interactiveHandlers: InteractiveActionHandlers = {
      sendCourseInfo: async (channel) => this.interactiveActions.sendCourseInfo(channel),
      sendBookingInstructions: async (channel) => this.interactiveActions.sendBookingInstructions(channel),
      sendStudyResources: async (channel) => this.interactiveActions.sendStudyResources(channel),
      sendAskQuestionModal: async (triggerId) => this.interactiveActions.sendAskQuestionModal(triggerId),
      sendInteractiveHelpMessage: async (channel, userId) => this.interactiveActions.sendInteractiveHelpMessage(channel, userId),
      handleButtonClick: async (channel: string, userId: string, actionId: string) => this.handleButtonClick(channel, userId, actionId),
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
      const payload = await this.constructPayload(enrichedMessage, history);

      const userMessage = payload.messages[payload.messages.length - 1].content;
      const formattedHistory: IMessage[] = history.map(h => new SlackMessage(h.getText(), message.getChannelId(), { role: h.role }));
      const metadataWithMessages = {
        ...payload.metadata,
        messages: payload.messages
      };

      const llmProvider = getLlmProvider()[0];
      const response = await llmProvider.generateChatCompletion(userMessage, formattedHistory, metadataWithMessages);
      debug('LLM Response:', response);

      const blocks = await markdownToBlocks(response, {
        lists: {
          checkboxPrefix: (checked: boolean) => checked ? ':white_check_mark: ' : ':ballot_box_with_check: ',
        },
      });

      const channelId = enrichedMessage.getChannelId();
      const threadTs = enrichedMessage.data.thread_ts;
      await this.sendMessageToChannel(channelId, response, undefined, threadTs, blocks);
      return response;
    });
  }

  private async enrichSlackMessage(message: SlackMessage): Promise<SlackMessage> {
    const botInfo = this.botManager.getAllBots()[0];
    const channelId = message.getChannelId();
    const userId = message.getAuthorId();
    debug('User ID from message:', userId); // Debug userId
    const threadTs = message.data.thread_ts;
    const suppressCanvasContent = process.env.SUPPRESS_CANVAS_CONTENT === 'true';

    try {
      const authInfo = await botInfo.webClient.auth.test();
      const workspaceInfo = { workspaceId: authInfo.team_id, workspaceName: authInfo.team };

      const channelInfoResp = await botInfo.webClient.conversations.info({ channel: channelId });
      const channelInfo = {
        channelId,
        channelName: channelInfoResp.channel?.name,
        description: channelInfoResp.channel?.purpose?.value,
        createdDate: channelInfoResp.channel?.created ? new Date(channelInfoResp.channel.created * 1000).toISOString() : undefined
      };

      const threadInfo = {
        isThread: !!threadTs,
        threadTs,
        threadOwnerUserId: threadTs ? message.data.user : undefined,
        threadParticipants: threadTs ? await this.getThreadParticipants(channelId, threadTs) : [],
        messageCount: threadTs ? await this.getThreadMessageCount(channelId, threadTs) : 0
      };

      let slackUser = {
        slackUserId: userId,
        userName: 'User',
        email: null as string | null,
        preferredName: null as string | null,
        isStaff: false
      };
      try {
        if (userId && userId !== 'unknown' && userId.startsWith('U')) { // Only call if valid ID
          const userInfo: SlackUserInfo = await botInfo.webClient.users.info({ user: userId });
          slackUser = {
            slackUserId: userId,
            userName: userInfo.user?.profile?.real_name || userInfo.user?.name || 'User',
            email: userInfo.user?.profile?.email || null,
            preferredName: userInfo.user?.profile?.real_name || null,
            isStaff: userInfo.user?.is_admin || userInfo.user?.is_owner || false
          };
          debug('Fetched user info:', slackUser);
        } else {
          debug('Invalid userId, skipping users.info call:', userId);
        }
      } catch (error) {
        debug(`Failed to fetch user info for userId ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      }

      let channelContent = message.data.channelContent ? { ...message.data.channelContent } : undefined;
      if (!suppressCanvasContent) {
        debug('Attempting to fetch canvas content for channel:', channelId);
        try {
          const listResponse = await botInfo.webClient.files.list({
            types: 'canvas',
            channel: channelId
          });
          debug('files.list response:', JSON.stringify(listResponse, null, 2));
          debug('Total files found:', listResponse.files?.length || 0);

          if (listResponse.ok && listResponse.files?.length) {
            const targetContent = listResponse.files.find(f => f.linked_channel_id === channelId) || listResponse.files[0];
            debug('Selected content from files.list:', targetContent?.id, targetContent?.url_private);

            if (targetContent && targetContent.id) {
              const contentInfo = await botInfo.webClient.files.info({ file: targetContent.id });
              debug('files.info response:', JSON.stringify(contentInfo, null, 2));
              if (contentInfo.ok) {
                debug('Channel content field:', contentInfo.content || 'Not present');
                if (contentInfo.file?.filetype === 'canvas' || contentInfo.file?.filetype === 'quip') {
                  channelContent = {
                    ...targetContent,
                    content: contentInfo.content || 'No content returned by API',
                    info: contentInfo.file
                  };
                  if (!contentInfo.content && contentInfo.file?.url_private) {
                    try {
                      const contentResponse = await axios.get(contentInfo.file.url_private, {
                        headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` }
                      });
                      channelContent.content = contentResponse.data || 'No content available';
                      debug('Fetched content from url_private:', channelContent.content.substring(0, 50) + '...');
                    } catch (fetchError) {
                      debug('Failed to fetch content from url_private:', fetchError);
                      channelContent.content = 'No content available';
                    }
                  }
                } else if (contentInfo.file && ['png', 'jpg', 'jpeg', 'gif'].includes(contentInfo.file.filetype || '')) {
                  const fileResponse = await axios.get(contentInfo.file.url_private!, {
                    headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                    responseType: 'arraybuffer'
                  });
                  const base64Content = Buffer.from(fileResponse.data).toString('base64');
                  channelContent = {
                    ...targetContent,
                    content: `data:${contentInfo.file.mimetype};base64,${base64Content}`,
                    info: contentInfo.file
                  };
                  debug('Binary content base64-encoded:', channelContent.content.substring(0, 50) + '...');
                } else {
                  throw new Error('Unsupported file type: ' + (contentInfo.file?.filetype || 'unknown'));
                }
              } else {
                throw new Error(contentInfo.error || 'Unknown error fetching channel content');
              }
              debug('Channel content retrieved:', channelContent.content);
            } else {
              debug('No valid content found in files.list');
              channelContent = { content: '', info: null };
            }
          } else {
            debug('No content found in files.list for channel:', channelId);
            channelContent = { content: '', info: null };
          }
        } catch (error) {
          debug(`Failed to retrieve Channel content: ${error}`);
          channelContent = { content: '', info: null };
        }
      } else {
        channelContent = { content: '', info: null };
      }

      const channelContentStr = (channelContent?.content || '').replace(/\n/g, '\\n').replace(/"/g, '\\"');
      const metadata = {
        channelInfo: { channelId: channelInfo.channelId },
        userInfo: { userName: slackUser.userName }
      };

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
        metadata,
        channelContent: { content: channelContentStr },
        workspaceInfo,
        channelInfo,
        threadInfo,
        slackUser,
        messageAttachments,
        messageReactions
      };
      debug('Enriched Message Data:', JSON.stringify(message.data, null, 2));
    } catch (error) {
      debug(`Failed to enrich message: ${error}`);
    }

    return message;
  }

  private async constructPayload(message: SlackMessage, history: IMessage[]): Promise<any> {
    const currentTs = `${Math.floor(Date.now() / 1000)}.2345`;

    const metadata = message.data.metadata || {
      channelInfo: { channelId: message.getChannelId() },
      userInfo: { userName: message.data.slackUser?.userName || 'User' }
    };

    const payload = {
      metadata,
      messages: [
        { role: "system", content: "You are a bot that assists slack users." },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: currentTs,
              type: "function",
              function: {
                name: "get_user_info",
                arguments: JSON.stringify({ username: metadata.userInfo.userName })
              }
            },
            {
              id: `${parseFloat(currentTs) + 0.0001}`,
              type: "function",
              function: {
                name: "get_channel_info",
                arguments: JSON.stringify({ channelId: metadata.channelInfo.channelId })
              }
            }
          ]
        },
        {
          role: "tool",
          tool_call_id: currentTs,
          tool_name: "get_user_info",
          content: JSON.stringify({
            slackUser: {
              slackUserId: message.data.slackUser?.slackUserId || 'unknown',
              userName: metadata.userInfo.userName,
              email: message.data.slackUser?.email || null,
              preferredName: message.data.slackUser?.preferredName || null
            }
          })
        },
        {
          role: "tool",
          tool_call_id: `${parseFloat(currentTs) + 0.0001}`,
          tool_name: "get_channel_info",
          content: JSON.stringify({ channelContent: { content: message.data.channelContent?.content || '' } })
        },
        { role: "user", content: message.getText() }
      ]
    };

    if (history.length > 0) {
      payload.messages = [
        ...history.map(h => ({ role: h.role, content: h.getText() })),
        ...payload.messages
      ];
    }

    debug('Final constructed payload before sending to LLM:', JSON.stringify(payload, null, 2));
    if (!payload.messages.some(m => m.content.includes('channelContent'))) {
      debug('Warning: Canvas content not found in payload messages');
    }
    return payload;
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string, blocks?: KnownBlock[]): Promise<string> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const botInfo = this.botManager.getBotByName(senderName || '') || this.botManager.getAllBots()[0];
    if (this.lastSentTs === threadId || this.lastSentTs === Date.now().toString()) {
      debug(`Duplicate message TS: ${threadId || this.lastSentTs}, skipping`);
      return '';
    }
    try {
      const options: any = {
        channel: channelId,
        text: text,
        username: senderName || displayName,
        icon_emoji: ':robot_face:',
        unfurl_links: true,
        unfurl_media: true,
      };
      if (threadId) options.thread_ts = threadId;
      if (blocks && blocks.length > 0) options.blocks = blocks;
      const result = await botInfo.webClient.chat.postMessage(options);
      debug(`Sent message to #${channelId}${threadId ? ` thread ${threadId}` : ''} as ${senderName || displayName}`);
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
          debug('Ignoring bot_message.');
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
        await this.sendBotWelcomeMessage(channel);
      } catch (error) {
        debug(`Failed to join #${channel}: ${error}`);
      }
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    const botInfo = this.botManager.getAllBots()[0];
    await botInfo.webClient.conversations.join({ channel });
    await this.sendBotWelcomeMessage(channel);
  }

  public async sendBotWelcomeMessage(channel: string): Promise<void> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const markdownMessage = slackConfig.get('SLACK_BOT_JOIN_CHANNEL_MESSAGE');
    const formattedMessage = markdownMessage.replace('{channel}', channel);
    const blocks = await this.processWelcomeMessage(formattedMessage, channel);
    const botInfo = this.botManager.getBotByName(displayName) || this.botManager.getAllBots()[0];
    try {
      await botInfo.webClient.chat.postMessage({
        channel,
        blocks,
      });
      debug(`Sent bot welcome message to #${channel} as ${displayName} with careful precision`);
    } catch (error) {
      debug(`Failed to send bot welcome message: ${error}`);
    }
  }

  public async sendUserWelcomeMessage(channel: string, userName: string): Promise<void> {
    const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
    const markdownMessage = slackConfig.get('SLACK_USER_JOIN_CHANNEL_MESSAGE');
    const formattedMessage = markdownMessage.replace('{user}', userName).replace('{channel}', channel);
    const blocks = await this.processWelcomeMessage(formattedMessage, channel);
    const botInfo = this.botManager.getBotByName(displayName) || this.botManager.getAllBots()[0];
    try {
      await botInfo.webClient.chat.postMessage({
        channel,
        blocks,
      });
      debug(`Sent user welcome message to #${channel} for ${userName} with careful precision`);
    } catch (error) {
      debug(`Failed to send user welcome message: ${error}`);
    }
  }

  private async processWelcomeMessage(markdown: string, channel: string): Promise<KnownBlock[]> {
    const [content, buttonsPart] = markdown.split('\n## Actions\n');
    let blocks: KnownBlock[] = [];

    if (content) {
      const contentBlocks = await markdownToBlocks(content, {
        lists: {
          checkboxPrefix: (checked: boolean) => checked ? ':white_check_mark: ' : ':ballot_box_with_check: ',
        },
      });
      blocks = blocks.concat(contentBlocks.filter(b => b.type !== 'actions' && b.type !== 'section' && !('elements' in b)));
    }

    if (buttonsPart) {
      const buttonLines = buttonsPart.trim().split('\n').filter(line => line.trim().startsWith('- ['));
      const actionsBlock: KnownBlock = { type: 'actions', elements: [] };
      for (const line of buttonLines) {
        const actionMatch = line.match(/-\s*\[([^\]]+)\]\(action:([^\)]+)\)/);
        if (actionMatch) {
          const buttonText = actionMatch[1];
          const actionId = actionMatch[2].replace('{channel}', channel);
          (actionsBlock.elements as any[]).push({
            type: 'button',
            text: { type: 'plain_text', text: buttonText },
            action_id: actionId,
            value: actionId,
            style: 'primary'
          });
        }
      }
      if (actionsBlock.elements.length > 0) {
        blocks.push(actionsBlock);
      }
    }

    debug('Processed Slack blocks:', JSON.stringify(blocks, null, 2));
    return blocks;
  }

  private async handleButtonClick(channel: string, userId: string, actionId: string): Promise<void> {
    const buttonMappings = process.env.SLACK_BUTTON_MAPPINGS || slackConfig.get('SLACK_BUTTON_MAPPINGS') || '{}';
    const mappings: { [key: string]: string } = JSON.parse(buttonMappings);

    const hardcodedMessage = mappings[actionId] || 'Unknown action';
    if (hardcodedMessage !== 'Unknown action') {
      await this.sendMessageToChannel(channel, hardcodedMessage, userId);
      debug(`User prompted to post hardcoded message in #${channel}: ${hardcodedMessage}`);
    } else {
      debug(`Unknown action ID ${actionId}, logging with detailed granularity`);
    }
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

  public getClientId(): string { return this.botManager.getAllBots()[0]?.botUserId || ''; }
  public getDefaultChannel(): string { return slackConfig.get('SLACK_DEFAULT_CHANNEL_ID') || ''; }
  public async shutdown(): Promise<void> { SlackService.instance = undefined; }
  public getBotManager(): SlackBotManager { return this.botManager; }
}