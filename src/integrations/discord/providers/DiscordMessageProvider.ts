class DiscordMessageProviderImpl {
  discordService: any;
  discordSvcLib: any;
  
  constructor() {
    this.discordSvcLib = require('../DiscordService');
    this.discordService = this.discordSvcLib.Discord.DiscordService.getInstance();
  }
  
  async sendMessage(channelId: any, message: any, senderName: any) {
    return await this.discordService.sendMessageToChannel(channelId, message, senderName);
  }
  
  async getMessages(channelId: any) {
    const messages = await this.discordService.fetchMessages(channelId);
    return messages.map((msg: any) => new this.discordSvcLib.DiscordMessage(msg));
  }
  
  async sendMessageToChannel(channelId: any, message: any, active_agent_name: any) {
    return await this.discordService.sendMessageToChannel(channelId, message, active_agent_name);
  }
  
  getClientId() {
    return this.discordService.getClientId();
  }
}
 
module.exports = DiscordMessageProviderImpl;
module.exports.DiscordMessageProvider = DiscordMessageProviderImpl;
