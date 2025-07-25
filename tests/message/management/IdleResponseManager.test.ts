import { IdleResponseManager } from '@message/management/IdleResponseManager';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { handleMessage } from '@message/handlers/messageHandler';
import { getMessengerProvider } from '@message/management/getMessengerProvider';

// Mock dependencies
jest.mock('@message/handlers/messageHandler');
jest.mock('@message/management/getMessengerProvider');
jest.mock('@config/messageConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'IDLE_RESPONSE') {
      return {
        enabled: true,
        minDelay: 60000,
        maxDelay: 3600000,
        prompts: ['Test prompt 1', 'Test prompt 2']
      };
    }
    return {};
  })
}));

// Create a mock message class
class MockMessage extends IMessage {
  constructor(content: string, channelId: string = 'test-channel') {
    super({}, 'user');
    this.content = content;
    this.channelId = channelId;
  }

  getMessageId(): string {
    return 'mock-message-id';
  }

  getTimestamp(): Date {
    return new Date();
  }

  setText(text: string): void {
    this.content = text;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getAuthorId(): string {
    return 'mock-user-id';
  }

  getChannelTopic(): string | null {
    return 'Test topic';
  }

  getUserMentions(): string[] {
    return [];
  }

  getChannelUsers(): string[] {
    return ['user1', 'user2'];
  }

  mentionsUsers(userId: string): boolean {
    return false;
  }

  isFromBot(): boolean {
    return false;
  }

  getAuthorName(): string {
    return 'Test User';
  }
}

describe('IdleResponseManager', () => {
  let idleResponseManager: IdleResponseManager;
  let mockMessengerService: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton instance
    (IdleResponseManager as any).instance = undefined;

    // Mock messenger service
    mockMessengerService = {
      getName: jest.fn().mockReturnValue('test-messenger'),
      getMessagesFromChannel: jest.fn(),
      sendMessageToChannel: jest.fn().mockResolvedValue('sent-message-id'),
    } as any;

    (getMessengerProvider as jest.Mock).mockReturnValue([mockMessengerService]);
    
    idleResponseManager = IdleResponseManager.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Don't call clearAllChannels to avoid clearTimeout issues
    // The singleton reset will handle cleanup
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = IdleResponseManager.getInstance();
      const instance2 = IdleResponseManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with messenger services', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      const stats = idleResponseManager.getStats();
      expect(stats.totalServices).toBe(1);
      expect(stats.serviceDetails[0].serviceName).toBe('test-messenger');
    });

    it('should handle Discord service with multiple bot instances', () => {
      const mockDiscordService = {
        providerName: 'discord',
        getAllBots: jest.fn().mockReturnValue([
          { botUserName: 'Bot1', botUserId: 'bot1-id' },
          { botUserName: 'Bot2', botUserId: 'bot2-id' }
        ]),
        sendMessageToChannel: jest.fn(),
        getMessagesFromChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('discord-client-id'),
        initialize: jest.fn(),
        sendPublicAnnouncement: jest.fn(),
        getDefaultChannel: jest.fn().mockReturnValue('default-channel'),
        shutdown: jest.fn(),
        setMessageHandler: jest.fn()
      };

      (getMessengerProvider as jest.Mock).mockReturnValue([mockDiscordService]);
      
      idleResponseManager.initialize();
      
      const stats = idleResponseManager.getStats();
      expect(stats.totalServices).toBe(2);
      expect(stats.serviceDetails.map(s => s.serviceName)).toContain('discord-Bot1');
      expect(stats.serviceDetails.map(s => s.serviceName)).toContain('discord-Bot2');
    });

    it('should handle Discord service with unnamed bots', () => {
      const mockDiscordService = {
        providerName: 'discord',
        getAllBots: jest.fn().mockReturnValue([
          { botUserId: 'bot1-id' },
          { botUserId: 'bot2-id' }
        ]),
        sendMessageToChannel: jest.fn(),
        getMessagesFromChannel: jest.fn(),
        getClientId: jest.fn().mockReturnValue('discord-client-id'),
        initialize: jest.fn(),
        sendPublicAnnouncement: jest.fn(),
        getDefaultChannel: jest.fn().mockReturnValue('default-channel'),
        shutdown: jest.fn(),
        setMessageHandler: jest.fn()
      };

      (getMessengerProvider as jest.Mock).mockReturnValue([mockDiscordService]);
      
      idleResponseManager.initialize();
      
      const stats = idleResponseManager.getStats();
      expect(stats.totalServices).toBe(2);
      expect(stats.serviceDetails.map(s => s.serviceName)).toContain('discord-bot1');
      expect(stats.serviceDetails.map(s => s.serviceName)).toContain('discord-bot2');
    });
  });

  describe('recordInteraction', () => {
    it('should record first interaction without scheduling', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      
      const stats = idleResponseManager.getStats();
      const channel = stats.serviceDetails[0].channelDetails.find(c => c.channelId === 'channel-123');
      
      expect(channel).toBeDefined();
      expect(channel?.interactionCount).toBe(1);
      expect(channel?.hasTimer).toBe(false);
    });

    it('should schedule idle response on second interaction', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-2');
      
      const stats = idleResponseManager.getStats();
      const channel = stats.serviceDetails[0].channelDetails.find(c => c.channelId === 'channel-123');
      
      expect(channel?.interactionCount).toBe(2);
      expect(channel?.hasTimer).toBe(true);
    });

    it('should update last interacted channel', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123');
      idleResponseManager.recordInteraction('test-messenger', 'channel-456');
      
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].lastInteractedChannel).toBe('channel-456');
    });

    it('should cancel existing timer when new interaction occurs', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-2');
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-3');
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('recordBotResponse', () => {
    it('should record bot response time', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-2');
      
      expect(() => {
        idleResponseManager.recordBotResponse('test-messenger', 'channel-123');
      }).not.toThrow();
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      idleResponseManager.configure({
        enabled: false,
        minDelay: 30000,
        maxDelay: 1800000,
        prompts: ['Custom prompt']
      });
      
      expect(() => idleResponseManager.initialize(['test-messenger'])).not.toThrow();
    });
  });

  describe('clearChannel', () => {
    it('should clear specific channel', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-2');
      
      idleResponseManager.clearChannel('test-messenger', 'channel-123');
      
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(0);
    });
  });

  describe('clearAllChannels', () => {
    it('should clear all channels', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-456', 'msg-1');
      
      idleResponseManager.clearAllChannels();
      
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      idleResponseManager.initialize(['test-messenger']);
      
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-1');
      idleResponseManager.recordInteraction('test-messenger', 'channel-123', 'msg-2');
      
      const stats = idleResponseManager.getStats();
      
      expect(stats.totalServices).toBe(1);
      expect(stats.serviceDetails[0].serviceName).toBe('test-messenger');
      expect(stats.serviceDetails[0].totalChannels).toBe(1);
      expect(stats.serviceDetails[0].lastInteractedChannel).toBe('channel-123');
    });
  });

  describe('environment variable configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = { ...originalEnv };
      // Reset singleton instance before each test
      (IdleResponseManager as any).instance = undefined;
    });

    afterEach(() => {
      process.env = originalEnv;
      // Reset singleton instance after each test
      (IdleResponseManager as any).instance = undefined;
    });

    it('should use environment variables for min delay override', () => {
      process.env.IDLE_RESPONSE_MIN_DELAY = '5000';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      // Access private property for testing
      expect((newManager as any).minDelay).toBe(5000);
    });

    it('should use environment variables for max delay override', () => {
      process.env.IDLE_RESPONSE_MAX_DELAY = '10000';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      expect((newManager as any).maxDelay).toBe(10000);
    });

    it('should use environment variables for enabled override', () => {
      process.env.IDLE_RESPONSE_ENABLED = 'false';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      expect((newManager as any).enabled).toBe(false);
    });

    it('should handle invalid environment variable values gracefully', () => {
      process.env.IDLE_RESPONSE_MIN_DELAY = 'invalid';
      process.env.IDLE_RESPONSE_MAX_DELAY = 'also-invalid';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      // Should fall back to config values
      expect((newManager as any).minDelay).toBe(60000);
      expect((newManager as any).maxDelay).toBe(3600000);
    });

    it('should ensure minDelay is not greater than maxDelay', () => {
      process.env.IDLE_RESPONSE_MIN_DELAY = '10000';
      process.env.IDLE_RESPONSE_MAX_DELAY = '5000';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      expect((newManager as any).minDelay).toBe(5000);
      expect((newManager as any).maxDelay).toBe(5000);
    });

    it('should prioritize environment variables over config', () => {
      process.env.IDLE_RESPONSE_MIN_DELAY = '15000';
      process.env.IDLE_RESPONSE_MAX_DELAY = '30000';
      
      const newManager = IdleResponseManager.getInstance();
      newManager.initialize(['test-messenger']);
      
      expect((newManager as any).minDelay).toBe(15000);
      expect((newManager as any).maxDelay).toBe(30000);
    });
  });
});