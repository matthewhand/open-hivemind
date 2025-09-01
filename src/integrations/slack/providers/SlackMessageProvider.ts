import { IMessageProvider } from '@message/interfaces/IMessageProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { SlackService } from '@integrations/slack/SlackService';

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

  public async getMessages(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!channelId) {
      return [];
    }
    try {
      // Tests expect provider to delegate with only (channelId)
      return await this.slackService.fetchMessages(channelId);
    } catch (error) {
      // Assuming error is of type Error
      const err = error as Error;
      console.error(`Failed to fetch messages for channel ${channelId}: ${err.message}`);
      return [];
    }
  }

  async sendMessageToChannel(channelId: string, message: string, active_agent_name?: string): Promise<string> {
    return await this.sendMessage(channelId, message, active_agent_name);
  }

  getClientId(): string {
    // Delegate to SlackService for the actual bot user ID
    return this.slackService.getClientId();
  }
}
