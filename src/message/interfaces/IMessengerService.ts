import { IMessage } from './IMessage';

export interface IMessengerService {
  initialize(): Promise<void>;
  sendMessageToChannel(channelId: string, message: string, senderName?: string, threadId?: string): Promise<string>;
  getMessagesFromChannel(channelId: string): Promise<IMessage[]>;
  sendPublicAnnouncement(channelId: string, announcement: any): Promise<void>;
  getClientId(): string;
  getDefaultChannel(): string;
  shutdown(): Promise<void>;
  setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>): void;
}
