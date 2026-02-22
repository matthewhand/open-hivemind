import { SlackService } from '../SlackService';
import type { IMessage } from '@message/interfaces/IMessage';
import type { IMessageProvider } from '@message/interfaces/IMessageProvider';

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
      console.error(`Failed to fetch messages for channel ${channelId}: ${err.message}`);
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
    // For Slack, the forum owner would be the channel creator
    // This is a simplified implementation - in a real implementation,
    // you would query the Slack API to get the channel creator
    try {
      // Placeholder implementation - in a real implementation, you would:
      // 1. Use the Slack Web API to get channel info
      // 2. Extract the creator/owner ID from the response
      // For now, we'll return a placeholder
      return `owner-${forumId}`;
    } catch (error) {
      console.error(`Failed to get forum owner for channel ${forumId}:`, error);
      // Return a default owner ID in case of error
      return 'default-owner';
    }
  }
}
