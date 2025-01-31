import { IMessageProvider } from '../interfaces/IMessageProvider';
import { SlackService } from '../../integrations/slack/SlackService';

export class SlackMessageProvider implements IMessageProvider {
  private _slackService?: SlackService;
  private get slackService() {
    if (process.env.NODE_ENV === 'test') {
      return SlackService.getInstance();
    }
    if (!this._slackService) {
      this._slackService = SlackService.getInstance();
    }
    return this._slackService;
  }

  async sendMessage(channelId: string, message: string) {
    await this.slackService.sendMessage(channelId, message);
  }

  async getMessages(channelId: string) {
    return await this.slackService.fetchMessages(channelId);
  }

  async sendMessageToChannel(channelId: string, message: string) {
    return this.sendMessage(channelId, message);
  }

  getClientId(): string {
    return "slack-bot"; // Replace with actual Slack bot client ID if needed
  }
}
