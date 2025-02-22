const DiscordSvcLib = require('@integrations/discord/DiscordService');

class DiscordMessageProvider {
  discordService: any;

  constructor() {
    this.discordService = DiscordSvcLib.DiscordService.getInstance();
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    return await this.discordService.sendMessageToChannel(channelId, message, senderName);
  }

  async getMessages(channelId: string): Promise<any[]> {
    console.log(`Fetching messages from Discord channel ${channelId}`);
    const messages = await this.discordService.fetchMessages(channelId);
    return messages;
  }

  async sendMessageToChannel(channelId: string, message: string, active_agent_name?: string): Promise<string> {
    return await this.discordService.sendMessageToChannel(channelId, message, active_agent_name);
  }

  getClientId(): string {
    return this.discordService.getClientId();
  }
}

module.exports = { DiscordMessageProvider };
