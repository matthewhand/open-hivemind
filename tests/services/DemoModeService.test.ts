/**
 * Tests for DemoModeService
 */
import 'reflect-metadata';

// Mocks
jest.mock('../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: { getInstance: () => ({ recordMetric: jest.fn(), incrementMessages: jest.fn() }) },
}));
jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: { getInstance: () => ({ log: jest.fn() }) },
}));
jest.mock('../../src/server/services/WebSocketService', () => ({
  WebSocketService: { 
    getInstance: () => ({ 
      recordMessageFlow: jest.fn(), 
      recordAlert: jest.fn(),
      getMessageFlow: () => [],
      getAlerts: () => [],
      getPerformanceMetrics: () => []
    }) 
  },
}));

import { DemoModeService } from '../../src/services/DemoModeService';

describe('DemoModeService', () => {
  let demoService: DemoModeService;
  let mockBotManager: any;
  let mockUserConfigStore: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockBotManager = {
      getAllBots: jest.fn(() => []),
      getWarnings: jest.fn(() => []),
      isLegacyMode: jest.fn(() => false),
      addBot: jest.fn(),
    };
    mockUserConfigStore = {
      getBotOverride: jest.fn(() => null),
      isBotDisabled: jest.fn(() => false),
    };
    
    // Create instance with mocks
    demoService = new (DemoModeService as any)(mockBotManager, mockUserConfigStore);
    
    // Clear environment
    delete process.env.DEMO_MODE;
  });

  afterEach(() => {
    demoService.reset();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create an instance', () => {
    expect(demoService).toBeInstanceOf(DemoModeService);
  });

  describe('detectDemoMode', () => {
    it('should return true when no bots are configured', () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      expect(demoService.detectDemoMode()).toBe(true);
    });

    it('should return true when DEMO_MODE is set to true', () => {
      process.env.DEMO_MODE = 'true';
      expect(demoService.detectDemoMode()).toBe(true);
    });
  });

  describe('conversation management', () => {
    it('should create a new conversation', () => {
      const conversation = demoService.getOrCreateConversation('channel-1', 'Demo Bot');
      expect(conversation.channelId).toBe('channel-1');
      expect(conversation.messages).toEqual([]);
    });

    it('should add messages to conversation', () => {
      const message = demoService.addMessage('channel-1', 'Demo Bot', 'Hello!', 'incoming');
      expect(message.content).toBe('Hello!');
      expect(message.type).toBe('incoming');
    });
  });

  describe('Edge Cases and Concurrency', () => {
    it('should handle concurrent addMessage calls safely', async () => {
      jest.useRealTimers();
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              demoService.addMessage('channel-1', 'Demo Bot', `Message ${i}`, 'incoming');
              resolve();
            }, Math.random() * 5);
          })
        );
      }
      await Promise.all(promises);

      const history = demoService.getConversationHistory('channel-1', 'Demo Bot');
      expect(history.length).toBe(50);
    });
  });
});
