import { Logger } from '@common/logger';
import axios from 'axios';
import { SlackBotManager } from './SlackBotManager';
import SlackMessage from './SlackMessage';
import { IMessage } from '@message/interfaces/IMessage';
import { KnownBlock } from '@slack/web-api';
import { InputSanitizer } from '@common/security/inputSanitizer';

const logger = Logger.create('app:SlackMessageProcessor');

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

export class SlackMessageProcessor {
  private botManager: SlackBotManager;

  constructor(botManager: SlackBotManager) {
    if (!botManager) {
      logger.error('Error: SlackBotManager instance required');
      throw new Error('SlackBotManager instance required');
    }
    this.botManager = botManager;
    logger.debug('SlackMessageProcessor initialized');
  }

  public async enrichSlackMessage(message: SlackMessage): Promise<SlackMessage> {
    logger.debug('Entering enrichSlackMessage', { text: message.getText(), channelId: message.getChannelId() });
    if (!message || !message.getChannelId()) {
      logger.error('Error: Invalid message or missing channelId');
      throw new Error('Message and channelId required');
    }

    const botInfo = this.botManager.getAllBots()[0];
    const channelId = message.getChannelId();
    let userId = message.getAuthorId();
    if ((userId === 'unknown' || !userId) && message.data.user) {
      userId = message.data.user;
    }
    logger.debug(`User ID from message: ${userId}`);
    const threadTs = message.data.thread_ts;
    const suppressCanvasContent = process.env.SUPPRESS_CANVAS_CONTENT === 'true';

    try {
      let authInfo;
      try {
        authInfo = await botInfo.webClient.auth.test();
        logger.debug(`Auth info: team_id=${authInfo.team_id}, team=${authInfo.team}`);
      } catch (authError) {
        logger.error(`Failed to authenticate with Slack API: ${authError}`);
        throw new Error(`Slack authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }
      const workspaceInfo = { workspaceId: authInfo.team_id, workspaceName: authInfo.team };

      let channelInfoResp;
      try {
        channelInfoResp = await botInfo.webClient.conversations.info({ channel: channelId });
        if (!channelInfoResp.ok) {
          logger.error(`Failed to fetch channel info: ${channelInfoResp.error}`);
          throw new Error(`Channel info fetch failed: ${channelInfoResp.error}`);
        }
      } catch (channelError) {
        logger.error(`Error fetching channel info for ${channelId}: ${channelError}`);
        throw new Error(`Channel info retrieval failed: ${channelError instanceof Error ? channelError.message : 'Unknown error'}`);
      }
      const channelInfo = {
        channelId,
        channelName: InputSanitizer.sanitizeName(channelInfoResp.channel?.name || 'unknown'),
        description: InputSanitizer.sanitizeText(channelInfoResp.channel?.purpose?.value || '', { maxLength: 500 }),
        createdDate: channelInfoResp.channel?.created ? new Date(channelInfoResp.channel.created * 1000).toISOString() : undefined
      };
      logger.debug(`Channel info: ${JSON.stringify(channelInfo)}`);

      const threadInfo = {
        isThread: !!threadTs,
        threadTs,
        threadOwnerUserId: threadTs ? message.data.user : undefined,
        threadParticipants: threadTs ? await this.getThreadParticipants(channelId, threadTs) : [],
        messageCount: threadTs ? await this.getThreadMessageCount(channelId, threadTs) : 0
      };
      logger.debug(`Thread info: ${JSON.stringify(threadInfo)}`);

      let slackUser = {
        slackUserId: userId,
        userName: 'User',
        email: null as string | null,
        preferredName: null as string | null,
        isStaff: false
      };
      try {
        if (userId && userId !== 'unknown' && userId.startsWith('U')) {
          const userInfo: SlackUserInfo = await botInfo.webClient.users.info({ user: userId });
          slackUser = {
            slackUserId: InputSanitizer.sanitizeUserId(userId),
            userName: InputSanitizer.sanitizeName(userInfo.user?.profile?.real_name || userInfo.user?.name || 'User'),
            email: InputSanitizer.sanitizeEmail(userInfo.user?.profile?.email),
            preferredName: InputSanitizer.sanitizeName(userInfo.user?.profile?.real_name),
            isStaff: userInfo.user?.is_admin || userInfo.user?.is_owner || false
          };
          logger.debug(`Fetched user info: ${JSON.stringify(slackUser)}`);
        } else {
          logger.debug(`Invalid userId, skipping users.info call: ${userId}`);
        }
      } catch (error) {
        logger.error(`Failed to fetch user info for userId ${userId}: ${error}`);
      }

      let channelContent = message.data.channelContent ? { ...message.data.channelContent } : undefined;
      if (!suppressCanvasContent) {
        logger.debug(`Attempting to fetch canvas content for channel: ${channelId}`);
        try {
          const listResponse = await botInfo.webClient.files.list({ types: 'canvas', channel: channelId });
          logger.debug(`files.list response: ok=${listResponse.ok}, files=${listResponse.files?.length || 0}`);
          if (listResponse.ok && listResponse.files?.length) {
            const targetContent = listResponse.files.find(f => f.linked_channel_id === channelId) || listResponse.files[0];
            logger.debug(`Selected content: id=${targetContent?.id}, url=${targetContent?.url_private}`);
            if (targetContent && targetContent.id) {
              const contentInfo = await botInfo.webClient.files.info({ file: targetContent.id });
              logger.debug(`files.info response: ok=${contentInfo.ok}`);
              if (contentInfo.ok) {
                logger.debug(`Channel content: ${contentInfo.content ? contentInfo.content.substring(0, 50) + '...' : 'Not present'}`);
                if (contentInfo.file?.filetype === 'canvas' || contentInfo.file?.filetype === 'quip') {
                  channelContent = {
                    ...targetContent,
                    content: InputSanitizer.sanitizeChannelContent(contentInfo.content || 'No content returned by API'),
                    info: contentInfo.file
                  };
                  if (!contentInfo.content && contentInfo.file?.url_private) {
                    try {
                      const contentResponse = await axios.get(contentInfo.file.url_private, {
                        headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                        timeout: 10000 // 10 second timeout
                      });
                      channelContent.content = InputSanitizer.sanitizeChannelContent(contentResponse.data || 'No content available');
                      logger.debug(`Fetched content from url_private: ${channelContent.content.substring(0, 50)}...`);
                    } catch (fetchError) {
                      logger.warn(`Failed to fetch content from url_private: ${fetchError instanceof Error ? fetchError.message : fetchError}`);
                      channelContent.content = 'Content temporarily unavailable';
                    }
                  }
                } else if (contentInfo.file && ['png', 'jpg', 'jpeg', 'gif'].includes(contentInfo.file.filetype || '')) {
                  try {
                    const fileResponse = await axios.get(contentInfo.file.url_private!, {
                      headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                      responseType: 'arraybuffer',
                      timeout: 15000, // 15 second timeout for binary files
                      maxContentLength: 10 * 1024 * 1024 // 10MB limit
                    });
                    const base64Content = Buffer.from(fileResponse.data).toString('base64');
                    channelContent = {
                      ...targetContent,
                      content: `data:${contentInfo.file.mimetype};base64,${base64Content}`,
                      info: contentInfo.file
                    };
                    logger.debug(`Binary content base64-encoded: ${channelContent.content.substring(0, 50)}...`);
                  } catch (binaryFetchError) {
                    logger.warn(`Failed to fetch binary content: ${binaryFetchError instanceof Error ? binaryFetchError.message : binaryFetchError}`);
                    channelContent = {
                      ...targetContent,
                      content: 'Binary content temporarily unavailable',
                      info: contentInfo.file
                    };
                  }
                } else {
                  throw new Error(`Unsupported file type: ${contentInfo.file?.filetype || 'unknown'}`);
                }
              } else {
                throw new Error(contentInfo.error || 'Unknown error fetching channel content');
              }
              logger.debug(`Channel content retrieved: ${channelContent.content.substring(0, 50)}...`);
            } else {
              logger.debug('No valid content found in files.list');
              channelContent = { content: '', info: null };
            }
          } else {
            logger.debug(`No content found in files.list for channel: ${channelId}`);
            channelContent = { content: '', info: null };
          }
        } catch (error) {
          logger.error(`Failed to retrieve channel content: ${error instanceof Error ? error.message : error}`);
          // Provide more specific error recovery based on error type
          if (error instanceof Error && error.message.includes('timeout')) {
            channelContent = { content: 'Channel content temporarily unavailable (timeout)', info: null };
          } else if (error instanceof Error && error.message.includes('auth')) {
            channelContent = { content: 'Channel content access denied', info: null };
          } else {
            channelContent = { content: 'Channel content unavailable', info: null };
          }
        }
      } else {
        channelContent = { content: '', info: null };
      }

      const sanitizedChannelContent = InputSanitizer.sanitizeChannelContent(channelContent?.content || '');
      const channelContentStr = sanitizedChannelContent.replace(/\n/g, '\\n').replace(/"/g, '\\"');
      const metadata = {
        channelInfo: { channelId: channelInfo.channelId },
        userInfo: { userName: slackUser.userName }
      };
      const messageAttachments = message.data.files?.map((file: any, index: number) => ({
        id: index + 9999,
        fileName: InputSanitizer.sanitizeFileName(file.name || 'unknown'),
        fileType: InputSanitizer.sanitizeText(file.filetype || 'unknown', { maxLength: 50, allowMarkdown: false }),
        url: file.url_private || '', // URLs are validated by Slack API
        size: typeof file.size === 'number' ? file.size : 0
      })) || [];
      const messageReactions = message.data.reactions?.map((reaction: any) => ({
        reaction: InputSanitizer.sanitizeText(reaction.name || 'unknown', { maxLength: 50, allowMarkdown: false }),
        reactedUserId: InputSanitizer.sanitizeUserId(reaction.users?.[0]),
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
      logger.debug(`Enriched message data: ${JSON.stringify(message.data, null, 2).substring(0, 200)}...`);
      return message;
    } catch (error) {
      logger.error(`Failed to enrich message: ${error instanceof Error ? error.message : error}`);
      // Provide more detailed error context for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorContext = {
        channelId: message.getChannelId(),
        messageId: message.getMessageId(),
        userId: message.getAuthorId()
      };
      logger.error(`Error context: ${JSON.stringify(errorContext)}`);
      throw new Error(`Message enrichment failed for channel ${channelId}: ${errorMessage}`);
    }
  }

  public async constructPayload(message: SlackMessage, history: IMessage[]): Promise<any> {
    logger.debug('Entering constructPayload', { text: message.getText(), channel: message.getChannelId() });
    if (!message) {
      logger.error('Error: Message required');
      throw new Error('Message required');
    }

    const currentTs = `${Math.floor(Date.now() / 1000)}.2345`;
    const metadata = message.data.metadata || {
      channelInfo: { channelId: message.getChannelId() },
      userInfo: { userName: message.data.slackUser?.userName || 'User' }
    };
    logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

    const payload = {
      metadata,
      messages: [
        { role: "system", content: "You are a bot that assists slack users." },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            { id: currentTs, type: "function", function: { name: "get_user_info", arguments: JSON.stringify({ username: metadata.userInfo.userName }) } },
            { id: `${parseFloat(currentTs) + 0.0001}`, type: "function", function: { name: "get_channel_info", arguments: JSON.stringify({ channelId: metadata.channelInfo.channelId }) } }
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

    if (history?.length > 0) {
      const historyMessages = history.map(h => {
        if (!h.getText()) {
          logger.warn('Warning: Empty history message detected');
          return { role: h.role || 'unknown', content: '' };
        }
        return { role: h.role || 'unknown', content: h.getText() };
      });
      payload.messages = [...historyMessages, ...payload.messages];
      logger.debug(`Added ${history.length} history messages to payload`);
    }

    logger.debug(`Final payload: ${JSON.stringify(payload, null, 2).substring(0, 200)}...`);
    return payload;
  }

  public async processResponse(rawResponse: string): Promise<{ text: string; blocks?: KnownBlock[] }> {
    logger.debug('Entering processResponse', { rawResponse: rawResponse.substring(0, 50) + (rawResponse.length > 50 ? '...' : '') });
    if (!rawResponse) {
      logger.error('Error: No response provided');
      return { text: 'No response available' };
    }

    try {
      // Preprocess: strip entities, fix quotes and contractions
      let processedText = rawResponse
        .replace(/"/gi, '"')
        .replace(/"/gi, '"')
        .replace(/["'"]|["'"]|["'"]/gi, '"')
        .replace(/&(?:amp;)?quot;/gi, '"')
        .replace(/'/gi, "'")
        .replace(/&[^;\s]+;/g, match => {
          const decoded = match
            .replace(/&/gi, '&')
            .replace(/"/gi, '"')
            .replace(/"/gi, '"')
            .replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));
          return decoded;
        })
        // Fix contractions only, preserve double quotes for quotations
        .replace(/(\w)"(\w)/g, "$1'$2") // roarin" → roarin'
        .replace(/(\w)"(\s|$)/g, "$1'$2") // plunderin" → plunderin'
        .replace(/['‘’]/g, "'"); // Normalize apostrophes
      logger.debug(`Processed text: ${processedText.substring(0, 50) + (processedText.length > 50 ? '...' : '')}`);

      // Manual mrkdwn formatting (bold and italics)
      processedText = processedText
        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold* (Slack mrkdwn)
        .replace(/__(.*?)__/g, '_$1_'); // Convert __italic__ to _italic_ (Slack mrkdwn)

      // Triple-decode and substitute entities, preserving " for quotes
      let finalText = processedText
        .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
        .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
        .replace(/&[^;\s]+;/g, match => match.replace(/&/gi, '&').replace(/"/gi, '"').replace(/"/gi, '"').replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10))))
        .replace(/"/gi, '"') // Ensure " stays "
        .replace(/"/gi, "'"); // Substitute ' only

      // Create a single mrkdwn block
      const blocks: KnownBlock[] = [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: finalText,
          verbatim: true // Prevent Slack re-escaping
        }
      }];

      logger.debug(`Final processed text: ${finalText.substring(0, 50) + (finalText.length > 50 ? '...' : '')}`);
      return { text: finalText, blocks };
    } catch (error) {
      logger.error(`Error processing response: ${error}`);
      return { text: 'Error processing response' };
    }
  }

  private async getThreadParticipants(channelId: string, threadTs: string): Promise<string[]> {
    logger.debug('Entering getThreadParticipants', { channelId, threadTs });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
      const participants = [...new Set(replies.messages?.map(m => m.user).filter(Boolean) as string[])];
      logger.debug(`Thread participants: ${participants.length} users`);
      return participants;
    } catch (error) {
      logger.error(`Failed to get thread participants: ${error}`);
      return [];
    }
  }

  private async getThreadMessageCount(channelId: string, threadTs: string): Promise<number> {
    logger.debug('Entering getThreadMessageCount', { channelId, threadTs });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
      const count = replies.messages?.length || 0;
      logger.debug(`Thread message count: ${count}`);
      return count;
    } catch (error) {
      logger.error(`Failed to get thread message count: ${error}`);
      return 0;
    }
  }
}
