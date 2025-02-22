const DiscordSvcLib = require('../DiscordService');

class DiscordMessageProviderImpl {
  discordService: any;

  constructor() {
    this.discordService = DiscordSvcLib.Discord.DiscordService.getInstance();
  }

  async sendMessage(channelId: any, message: any, senderName: any) {
    return await this.discordService.sendMessageToChannel(channelId, message, senderName);
  }

  async getMessages(channelId: any) {
    const messages = await this.discordService.fetchMessages(channelId);
    return messages.map((msg: any) => new DiscordSvcLib.DiscordMessage(msg));
  }

  async sendMessageToChannel(channelId: any, message: any, active_agent_name: any) {
    return await this.discordService.sendMessageToChannel(channelId, message, active_agent_name);
  }

  getClientId() {
    return this.discordService.getClientId();
  }
}

module.exports = { DiscordMessageProvider: DiscordMessageProviderImpl };
