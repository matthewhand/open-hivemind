import { IMessage } from './IMessage';

export interface IMessageProvider {
  sendMessage(channelId: string, message: string, senderName?: string): Promise<string>;
  getMessages(channelId: string): Promise<IMessage[]>;
  sendMessageToChannel(channelId: string, message: string, active_agent_name?: string): Promise<string>;
  getClientId(): string;
}
