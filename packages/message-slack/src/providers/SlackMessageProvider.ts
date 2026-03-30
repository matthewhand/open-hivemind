import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessageProvider } from '@message/interfaces/IMessageProvider';
import { Logger } from '@common/logger';
import { SlackService } from '../SlackService';

const logger = Logger.withContext('SlackMessageProvider');

export class SlackMessageProvider implements IMessageProvider {
  private _slackService?: SlackService;
  private get slackService() {
    // Always use singleton accessor to avoid multiple instances
    if (!this._slackService) {
      this._slackService = SlackService.getInstance();
    }
    return this._slackService;
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    return await this.slackService.sendMessageToChannel(channelId, message, senderName);
  }

  public async getMessages(channelId: string, limit?: number): Promise<IMessage[]> {
    if (!channelId) {
      return [];
    }
    try {
      // Keep backwards-compatibility: when no limit is provided, delegate with only (channelId)
      // to satisfy existing tests/mocks.
      if (typeof limit !== 'number') {
        return await this.slackService.fetchMessages(channelId);
      }
      return await this.slackService.fetchMessages(channelId, limit);
    } catch (error) {
      // Assuming error is of type Error
      const err = error as Error;
      logger.error('Failed to fetch messages for channel', { channelId, error: err.message });
      return [];
    }
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string> {
    return await this.sendMessage(channelId, message, active_agent_name);
  }

  getClientId(): string {
    // Delegate to SlackService for the actual bot user ID
    return this.slackService.getClientId();
  }

  async getForumOwner(forumId: string): Promise<string> {
    try {
      // Delegate to SlackService which queries the Slack API for channel creator
      if (typeof (this.slackService as any).getChannelOwnerId === 'function') {
        const ownerId = await (this.slackService as any).getChannelOwnerId(forumId);
        return ownerId || '';
      }
      return '';
    } catch (error) {
      logger.error('Failed to get forum owner for channel', { forumId, error });
      return '';
    }
  }
}
