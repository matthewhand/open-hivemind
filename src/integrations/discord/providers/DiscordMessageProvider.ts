import { IMessageProvider } from '@message/interfaces/IMessageProvider';
import { DiscordService } from '@integrations/discord/DiscordService';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from '../DiscordMessage'; // Import DiscordMessage

export class DiscordMessageProvider implements IMessageProvider {
  private discordService: DiscordService;

  constructor() {
    this.discordService = DiscordService.getInstance();
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    return await this.discordService.sendMessageToChannel(channelId, message, senderName);
  }

  async getMessages(channelId: string): Promise<IMessage[]> {
    console.log(`Fetching messages from Discord channel ${channelId}`);
    const messages = await this.discordService.fetchMessages(channelId);
    return messages; // Already returns IMessage[] via DiscordMessage
  }

  async sendMessageToChannel(channelId: string, message: string, active_agent_name?: string): Promise<string> {
    return await this.discordService.sendMessageToChannel(channelId, message, active_agent_name);
  }

  getClientId(): string {
    return this.discordService.getClientId();
  }
}
