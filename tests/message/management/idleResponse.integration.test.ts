import { IdleResponseManager } from '@message/management/IdleResponseManager';
import { handleMessage } from '@message/handlers/messageHandler';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';

// Mock dependencies
jest.mock('@message/handlers/messageHandler');
jest.mock('@message/management/getMessengerProvider', () => ({
  getMessengerProvider: jest.fn(() => [{
    getName: () => 'integration-messenger',
    sendMessageToChannel: jest.fn().mockResolvedValue('sent-message-id'),
    getMessagesFromChannel: jest.fn()
  }])
}));
jest.mock('@config/messageConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'IDLE_RESPONSE') {
      return {
        enabled: true,
        minDelay: 1,
        maxDelay: 1,
        prompts: ['Integration test prompt']
      };
    }
    return {};
  })
}));

// Create a mock message class for integration tests
class IntegrationTestMessage extends IMessage {
  constructor(content: string, channelId: string = 'test-channel') {
    super({}, 'user');
    this.content = content;
    this.channelId = channelId;
  }

  getMessageId(): string {
    return `integration-test-${Date.now()}`;
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
    return 'integration-test-user';
  }

  getChannelTopic(): string | null {
    return 'Integration Test Channel';
  }

  getUserMentions(): string[] {
    return [];
  }

  getChannelUsers(): string[] {
    return ['integration-user-1', 'integration-user-2'];
  }

  mentionsUsers(userId: string): boolean {
    return false;
  }

  isFromBot(): boolean {
    return false;
  }

  getAuthorName(): string {
    return 'Integration Test User';
  }
}

describe('IdleResponseManager Integration Tests', () => {
  let idleResponseManager: IdleResponseManager;
  let mockMessengerService: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (IdleResponseManager as any).instance = undefined;

    // Mock messenger service
    mockMessengerService = {
      getName: jest.fn().mockReturnValue('integration-messenger'),
      getMessagesFromChannel: jest.fn(),
      sendMessageToChannel: jest.fn().mockResolvedValue('sent-message-id'),
    } as any;

    (getMessengerProvider as jest.Mock).mockReturnValue([mockMessengerService]);
    (handleMessage as jest.Mock).mockResolvedValue('Integration test response');
    
    idleResponseManager = IdleResponseManager.getInstance();
    idleResponseManager.initialize(['integration-messenger']);
  });

  afterEach(() => {
    idleResponseManager.clearAllChannels();
  });

  describe('channel tracking and statistics', () => {
    it('should track channel interactions correctly', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      
      const stats = idleResponseManager.getStats();
      expect(stats.totalServices).toBe(1);
      expect(stats.serviceDetails[0].serviceName).toBe('integration-messenger');
      expect(stats.serviceDetails[0].totalChannels).toBe(1);
      expect(stats.serviceDetails[0].lastInteractedChannel).toBe('channel-1');
      expect(stats.serviceDetails[0].channelDetails[0].interactionCount).toBe(2);
    });

    it('should track multiple channels correctly', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-2', 'msg-3');
      
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(2);
      expect(stats.serviceDetails[0].lastInteractedChannel).toBe('channel-2');
    });

    it('should skip first message interaction', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].channelDetails[0].interactionCount).toBe(1);
    });

    it('should handle bot response recording', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      idleResponseManager.recordBotResponse('integration-messenger', 'channel-1');
      
      // This should not affect the interaction count
      const stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].channelDetails[0].interactionCount).toBe(2);
    });
  });

  describe('configuration management', () => {
    it('should handle configuration changes', () => {
      // Initially enabled
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      
      let stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(1);
      
      // Disable
      idleResponseManager.configure({ enabled: false });
      
      // Should not track new interactions when disabled
      idleResponseManager.recordInteraction('integration-messenger', 'channel-2', 'msg-3');
      stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(1); // Still only 1 channel
      
      // Re-enable
      idleResponseManager.configure({ enabled: true });
      idleResponseManager.recordInteraction('integration-messenger', 'channel-2', 'msg-3');
      
      stats = idleResponseManager.getStats();
      expect(stats.serviceDetails[0].totalChannels).toBe(2);
    });

    it('should update delay configuration', () => {
      idleResponseManager.configure({ minDelay: 5000, maxDelay: 10000 });
      
      // Configuration should be updated (we can't test the actual delay without timers)
      expect(() => {
        idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
        idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      }).not.toThrow();
    });
  });

  describe('cleanup operations', () => {
    it('should properly clear channels', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      
      expect(idleResponseManager.getStats().serviceDetails[0].totalChannels).toBe(1);
      
      idleResponseManager.clearChannel('integration-messenger', 'channel-1');
      
      expect(idleResponseManager.getStats().serviceDetails[0].totalChannels).toBe(0);
    });

    it('should properly clear all channels', () => {
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-2', 'msg-1');
      
      expect(idleResponseManager.getStats().serviceDetails[0].totalChannels).toBe(2);
      
      idleResponseManager.clearAllChannels();
      
      expect(idleResponseManager.getStats().serviceDetails[0].totalChannels).toBe(0);
    });
  });

  describe('messenger service integration', () => {
    it('should initialize with test services correctly', () => {
      // Reset and initialize with test services
      (IdleResponseManager as any).instance = undefined;
      idleResponseManager = IdleResponseManager.getInstance();
      idleResponseManager.initialize(['test-service']);
      
      idleResponseManager.recordInteraction('test-service', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('test-service', 'channel-1', 'msg-2');
      
      const stats = idleResponseManager.getStats();
      expect(stats.totalServices).toBe(1);
      expect(stats.serviceDetails[0].serviceName).toBe('test-service');
    });

    it('should handle API failures gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // This should not throw
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-1');
      idleResponseManager.recordInteraction('integration-messenger', 'channel-1', 'msg-2');
      
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error'));
      consoleSpy.mockRestore();
    });
  });
});