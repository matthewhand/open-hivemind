import { TelegramService } from '@src/integrations/telegram/TelegramService';

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService('test-token');
  });

  test('should connect successfully', async () => {
    await service.connect();
    expect(service.isConnected()).toBe(true);
  });

  test('should disconnect successfully', async () => {
    await service.connect();
    await service.disconnect();
    expect(service.isConnected()).toBe(false);
  });

  test('should return message ID when sending', async () => {
    const messageId = await service.sendMessage('test-chat', 'test message');
    expect(messageId).toBe('telegram_message_id');
  });

  test('should not support channel prioritization', () => {
    expect(service.supportsChannelPrioritization).toBe(false);
  });
});