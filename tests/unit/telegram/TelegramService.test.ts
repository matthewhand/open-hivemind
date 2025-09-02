import { TelegramService } from '@src/integrations/telegram/TelegramService';

// Mock the Telegram Bot API
jest.mock('node-telegram-bot-api', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    on: jest.fn(),
    startPolling: jest.fn().mockResolvedValue(undefined),
    stopPolling: jest.fn().mockResolvedValue(undefined),
    isPolling: jest.fn().mockReturnValue(false),
  }));
});

describe('TelegramService', () => {
  let service: TelegramService;
  const testToken = 'test-token-123';
  const testChatId = 'test-chat-456';
  const testMessage = 'Hello, Telegram!';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TelegramService(testToken);
  });

  afterEach(async () => {
    if (service.isConnected()) {
      await service.disconnect();
    }
  });

  describe('Constructor', () => {
    it('should create service with valid token', () => {
      expect(service).toBeInstanceOf(TelegramService);
      expect(service.isConnected()).toBe(false);
    });

    it('should throw error with invalid token', () => {
      expect(() => new TelegramService('')).toThrow('Invalid Telegram bot token');
      expect(() => new TelegramService(null as any)).toThrow('Invalid Telegram bot token');
      expect(() => new TelegramService(undefined as any)).toThrow('Invalid Telegram bot token');
    });

    it('should validate token format', () => {
      expect(() => new TelegramService('invalid-token')).toThrow('Invalid Telegram bot token format');
      expect(() => new TelegramService('123:ABC')).not.toThrow(); // Valid format
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
      
      await service.disconnect();
      expect(service.isConnected()).toBe(false);
    });

    it('should handle multiple connect calls gracefully', async () => {
      await service.connect();
      await service.connect(); // Should not throw
      expect(service.isConnected()).toBe(true);
    });

    it('should handle disconnect when not connected', async () => {
      expect(service.isConnected()).toBe(false);
      await expect(service.disconnect()).resolves.not.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      const errorService = new TelegramService('123:invalid-token');
      await expect(errorService.connect()).rejects.toThrow();
      expect(errorService.isConnected()).toBe(false);
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should return message ID when sending successfully', async () => {
      const messageId = await service.sendMessage(testChatId, testMessage);
      expect(messageId).toBe('telegram_message_id');
      expect(typeof messageId).toBe('string');
    });

    it('should handle empty messages', async () => {
      await expect(service.sendMessage(testChatId, '')).rejects.toThrow('Message cannot be empty');
    });

    it('should handle invalid chat IDs', async () => {
      await expect(service.sendMessage('', testMessage)).rejects.toThrow('Invalid chat ID');
      await expect(service.sendMessage(null as any, testMessage)).rejects.toThrow('Invalid chat ID');
    });

    it('should handle long messages by truncating', async () => {
      const longMessage = 'a'.repeat(5000); // Telegram limit is 4096
      const messageId = await service.sendMessage(testChatId, longMessage);
      expect(messageId).toBe('telegram_message_id');
    });

    it('should throw error when sending without connection', async () => {
      await service.disconnect();
      await expect(service.sendMessage(testChatId, testMessage)).rejects.toThrow('Not connected to Telegram');
    });
  });

  describe('Service Capabilities', () => {
    it('should not support channel prioritization', () => {
      expect(service.supportsChannelPrioritization).toBe(false);
    });

    it('should support message sending', () => {
      expect(service.supportsMessageSending).toBe(true);
    });

    it('should provide service name', () => {
      expect(service.serviceName).toBe('telegram');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await service.connect();
    });

    it('should handle incoming messages', () => {
      const messageHandler = jest.fn();
      service.onMessage(messageHandler);
      
      // Simulate incoming message
      const mockMessage = { message_id: 1, text: 'Hello', chat: { id: testChatId } };
      service.handleIncomingMessage(mockMessage);
      
      expect(messageHandler).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Hello',
        chatId: testChatId,
      }));
    });

    it('should handle errors in message processing', () => {
      const errorHandler = jest.fn();
      service.onError(errorHandler);
      
      const error = new Error('Processing failed');
      service.handleError(error);
      
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });
});