import Debug from 'debug';
import axios from 'axios';
import { SlackBotManager } from './SlackBotManager';
import SlackMessage from './SlackMessage';
import { IMessage } from '@message/interfaces/IMessage';
import { KnownBlock } from '@slack/web-api';
import { ConfigurationError, ValidationError, NetworkError } from '@src/types/errorClasses';

const debug = Debug('app:SlackMessageProcessor');

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
      throw new ConfigurationError(
        'SlackBotManager instance required',
        'SLACK_BOT_MANAGER_REQUIRED'
      );
    }
    this.botManager = botManager;
  }

  async enrichSlackMessage(message: SlackMessage): Promise<SlackMessage> {
    if (!message || !message.getChannelId()) {
      debug('Error: Invalid message or missing channelId');
      throw new ValidationError(
        'Message and channelId required',
        'SLACK_MESSAGE_VALIDATION_FAILED'
      );
    }

    const botInfo = this.botManager.getAllBots()[0];
    if (!botInfo) {
      debug('Error: Bot information not found');
      throw new ConfigurationError(
        'Bot information not found',
        'SLACK_BOT_INFO_NOT_FOUND'
      );
    }
    const channelId = message.getChannelId();
    let userId = message.getAuthorId();
    if ((userId === 'unknown' || !userId) && message.data.user) {
      userId = typeof message.data.user === 'string' ? message.data.user : message.data.user.id;
    }
    debug(`User ID from message: ${userId}`);
    const threadTs = message.data.thread_ts;
    const suppressCanvasContent = process.env.SUPPRESS_CANVAS_CONTENT === 'true';

    try {
      const authInfo = await botInfo.webClient.auth.test();
      debug(`Auth info: team_id=${authInfo.team_id}, team=${authInfo.team}`);
      const workspaceInfo = { workspaceId: authInfo.team_id, workspaceName: authInfo.team };

      const channelInfoResp = await botInfo.webClient.conversations.info({ channel: channelId });
      if (!channelInfoResp.ok) {
        debug(`Failed to fetch channel info: ${channelInfoResp.error}`);
        throw ErrorUtils.createError(
          `Channel info fetch failed: ${channelInfoResp.error}`,
          'IntegrationError',
          'SLACK_CHANNEL_INFO_FETCH_FAILED',
          500
        );
      }
      const channelInfo = {
        channelId,
        channelName: channelInfoResp.channel?.name || 'unknown',
        description: channelInfoResp.channel?.purpose?.value || '',
        createdDate: channelInfoResp.channel?.created ? new Date(channelInfoResp.channel.created * 1000).toISOString() : undefined
      };
      debug(`Channel info: ${JSON.stringify(channelInfo)}`);

      const threadInfo = {
        isThread: !!threadTs,
        threadTs,
        threadOwnerUserId: threadTs ? message.data.user : undefined,
        threadParticipants: threadTs ? await this.getThreadParticipants(channelId, threadTs) : [],
        messageCount: threadTs ? await this.getThreadMessageCount(channelId, threadTs) : 0
      };
      debug(`Thread info: ${JSON.stringify(threadInfo)}`);

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
            slackUserId: userId,
            userName: userInfo.user?.profile?.real_name || userInfo.user?.name || 'User',
            email: userInfo.user?.profile?.email || null,
            preferredName: userInfo.user?.profile?.real_name || null,
            isStaff: userInfo.user?.is_admin || userInfo.user?.is_owner || false
          };
          debug(`Fetched user info: ${JSON.stringify(slackUser)}`);
        } else {
          debug(`Invalid userId, skipping users.info call: ${userId}`);
        }
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        const errorInfo = ErrorUtils.classifyError(hivemindError);
        debug(`Failed to fetch user info for userId ${userId}:`, {
          error: hivemindError.message,
          errorCode: hivemindError.code,
          errorType: errorInfo.type,
          severity: errorInfo.severity,
          userId
        });
      }

      let channelContent = message.data.channelContent ? { ...message.data.channelContent } : undefined;
      if (!suppressCanvasContent) {
        debug(`Attempting to fetch canvas content for channel: ${channelId}`);
        try {
          const listResponse = await botInfo.webClient.files.list({ types: 'canvas', channel: channelId });
          debug(`files.list response: ok=${listResponse.ok}, files=${listResponse.files?.length || 0}`);
          if (listResponse.ok && listResponse.files?.length) {
            const targetContent = listResponse.files.find(f => f.linked_channel_id === channelId) || listResponse.files[0];
            debug(`Selected content: id=${targetContent?.id}, url=${targetContent?.url_private}`);
            if (targetContent && targetContent.id) {
              const contentInfo = await botInfo.webClient.files.info({ file: targetContent.id });
              debug(`files.info response: ok=${contentInfo.ok}`);
              if (contentInfo.ok) {
                debug(`Channel content: ${contentInfo.content ? contentInfo.content.substring(0, 50) + '...' : 'Not present'}`);
                if (contentInfo.file?.filetype === 'canvas' || contentInfo.file?.filetype === 'quip') {
                  channelContent = {
                    ...targetContent,
                    content: contentInfo.content || 'No content returned by API',
                    info: contentInfo.file
                  };
                  if (!contentInfo.content && contentInfo.file?.url_private) {
                    try {
                      const contentResponse = await axios.get(contentInfo.file.url_private, {
                        headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                        timeout: 15000
                      });
                      channelContent.content = contentResponse.data || 'No content available';
                      debug(`Fetched content from url_private: ${channelContent.content.substring(0, 50)}...`);
                    } catch (fetchError: unknown) {
                      const hivemindError = ErrorUtils.toHivemindError(fetchError);
                      const errorInfo = ErrorUtils.classifyError(hivemindError);
                      debug(`Failed to fetch content from url_private:`, {
                        error: hivemindError.message,
                        errorCode: hivemindError.code,
                        errorType: errorInfo.type,
                        severity: errorInfo.severity
                      });
                      channelContent.content = 'No content available';
                    }
                  }
                } else if (contentInfo.file && ['png', 'jpg', 'jpeg', 'gif'].includes(contentInfo.filetype || '')) {
                  const fileResponse = await axios.get(contentInfo.file.url_private!, {
                    headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` },
                    responseType: 'arraybuffer',
                    timeout: 15000
                  });
                  const base64Content = Buffer.from(fileResponse.data).toString('base64');
                  channelContent = {
                    ...targetContent,
                    content: `data:${contentInfo.file.mimetype};base64,${base64Content}`,
                    info: contentInfo.file
                  };
                  debug(`Binary content base64-encoded: ${channelContent.content.substring(0, 50)}...`);
                } else {
                  throw ErrorUtils.createError(
                    `Unsupported file type: ${contentInfo.file?.filetype || 'unknown'}`,
                    'ValidationError',
                    'SLACK_UNSUPPORTED_FILE_TYPE',
                    400
                  );
                }
              } else {
                throw ErrorUtils.createError(
                  contentInfo.error || 'Unknown error fetching channel content',
                  'IntegrationError',
                  'SLACK_CHANNEL_CONTENT_FETCH_FAILED',
                  500
                );
              }
              debug(`Channel content retrieved: ${channelContent.content.substring(0, 50)}...`);
            } else {
              debug('No valid content found in files.list');
              channelContent = { content: '', info: null };
            }
          } else {
            debug(`No content found in files.list for channel: ${channelId}`);
            channelContent = { content: '', info: null };
          }
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          const errorInfo = ErrorUtils.classifyError(hivemindError);
          debug(`Failed to retrieve channel content:`, {
            error: hivemindError.message,
            errorCode: hivemindError.code,
            errorType: errorInfo.type,
            severity: errorInfo.severity,
            channelId
          });
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
        fileName: file.name || 'unknown',
        fileType: file.filetype || 'unknown',
        url: file.url_private || '',
        size: file.size || 0
      })) || [];
      const messageReactions = message.data.reactions?.map((reaction: any) => ({
        reaction: reaction.name || 'unknown',
        reactedUserId: reaction.users?.[0] || 'unknown',
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
      debug(`Enriched message data: ${JSON.stringify(message.data, null, 2).substring(0, 200)}...`);
      return message;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to enrich message:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity
      });
      throw ErrorUtils.createError(
        `Message enrichment failed: ${hivemindError.message}`,
        errorInfo.type,
        'SLACK_MESSAGE_ENRICHMENT_FAILED',
        500
      );
    }
  }

  public async constructPayload(message: SlackMessage, history: IMessage[]): Promise<any> {
    debug('Entering constructPayload', { text: message.getText(), channel: message.getChannelId() });
    if (!message) {
      debug('Error: Message required');
      throw ErrorUtils.createError(
        'Message required',
        'ValidationError',
        'SLACK_MESSAGE_REQUIRED',
        400
      );
    }

    const currentTs = `${Math.floor(Date.now() / 1000)}.2345`;
    const metadata = message.data.metadata || {
      channelInfo: { channelId: message.getChannelId() },
      userInfo: { userName: message.data.slackUser?.userName || 'User' }
    };
    debug(`Metadata: ${JSON.stringify(metadata)}`);

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
          debug('Warning: Empty history message detected');
          return { role: h.role || 'unknown', content: '' };
        }
        return { role: h.role || 'unknown', content: h.getText() };
      });
      payload.messages = [...historyMessages, ...payload.messages];
      debug(`Added ${history.length} history messages to payload`);
    }

    debug(`Final payload: ${JSON.stringify(payload, null, 2).substring(0, 200)}...`);
    return payload;
  }

  public async processResponse(rawResponse: string): Promise<{ text: string; blocks?: KnownBlock[] }> {
    debug('Entering processResponse', { rawResponse: rawResponse.substring(0, 50) + (rawResponse.length > 50 ? '...' : '') });
    if (!rawResponse) {
      debug('Error: No response provided');
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
      debug(`Processed text: ${processedText.substring(0, 50) + (processedText.length > 50 ? '...' : '')}`);

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

      debug(`Final processed text: ${finalText.substring(0, 50) + (finalText.length > 50 ? '...' : '')}`);
      return { text: finalText, blocks };
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Error processing response:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity
      });
      return { text: 'Error processing response' };
    }
  }

  private async getThreadParticipants(channelId: string, threadTs: string): Promise<string[]> {
    debug('Entering getThreadParticipants', { channelId, threadTs });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
      const participants = [...new Set(replies.messages?.map(m => m.user).filter(Boolean) as string[])];
      debug(`Thread participants: ${participants.length} users`);
      return participants;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to get thread participants:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        channelId,
        threadTs
      });
      return [];
    }
  }

  private async getThreadMessageCount(channelId: string, threadTs: string): Promise<number> {
    debug('Entering getThreadMessageCount', { channelId, threadTs });
    const botInfo = this.botManager.getAllBots()[0];
    try {
      const replies = await botInfo.webClient.conversations.replies({ channel: channelId, ts: threadTs });
      const count = replies.messages?.length || 0;
      debug(`Thread message count: ${count}`);
      return count;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Failed to get thread message count:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        channelId,
        threadTs
      });
      return 0;
    }
  }
}
