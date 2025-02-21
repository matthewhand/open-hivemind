import { IMessageProvider } from '@message/interfaces/IMessageProvider';

export class DiscordMessageProvider implements IMessageProvider {
  async sendMessage(channelId: string, message: string) {
    console.log(`Sending message to Discord channel ${channelId}: ${message}`);
  }

  async getMessages(channelId: string) {
    console.log(`Fetching messages from Discord channel ${channelId}`);
    return [{ text: "Test message from Discord" }];
  }

  async sendMessageToChannel(channelId: string, message: string) {
    return this.sendMessage(channelId, message);
  }

  getClientId(): string {
    return "discord-bot";
  }
}
