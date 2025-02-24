import { Discord } from '@integrations/discord/DiscordService';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from '../DiscordMessage';

export class DiscordMessageProvider {
  private discordSvc: any;

  constructor() {
    this.discordSvc = Discord.DiscordService.getInstance();
  }

  public async getMessages(channelId: string): Promise<IMessage[]> {
    const messages = await this.discordSvc.getMessagesFromChannel(channelId);
    return messages.map((msg: any) => new DiscordMessage(msg));
  }
}
