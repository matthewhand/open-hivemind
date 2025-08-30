import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';

export class TelegramService implements IMessengerService {
  private botToken: string;
  private connected = false;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  async connect(): Promise<void> {
    // TODO: Implement Telegram Bot API connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async sendMessage(chatId: string, content: string): Promise<string> {
    // TODO: Implement Telegram message sending
    return 'telegram_message_id';
  }

  async fetchMessages(chatId: string, limit?: number): Promise<IMessage[]> {
    // TODO: Implement Telegram message fetching
    return [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  supportsChannelPrioritization = false;

  scoreChannel(): number {
    return 0;
  }
}