import { IMessageProvider } from '../interfaces/IMessageProvider';
import { SlackService } from '../../integrations/slack/SlackService';

export class SlackMessageProvider implements IMessageProvider {
  private slackService = new SlackService();

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
