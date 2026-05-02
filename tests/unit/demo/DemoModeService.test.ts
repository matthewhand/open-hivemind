import { DemoModeService } from '../../../src/services/DemoModeService';

describe('DemoModeService', () => {
  let mockStateService: any;
  let mockConversationManager: any;
  let service: DemoModeService;

  beforeEach(() => {
    mockConversationManager = {
      getOrCreateConversation: jest.fn((channelId, botName) => ({
        id: `conv-${botName}-${channelId}`,
        channelId,
        botName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      addMessage: jest.fn(
        (channelId, botName, content, type, userId = 'demo-user', userName = 'Demo User') => ({
          id: `msg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          botName,
          channelId,
          userId,
          userName,
          content,
          type,
          isDemo: true,
        })
      ),
      getConversationHistory: jest.fn(() => []),
      getAllConversations: jest.fn(() => []),
      generateDemoResponse: jest.fn((msg) => `Response to: ${msg}`),
      reset: jest.fn(),
    };

    mockStateService = {
      detectDemoMode: jest.fn(() => true),
      initialize: jest.fn().mockResolvedValue(undefined),
      isInDemoMode: jest.fn(() => false),
      setDemoMode: jest.fn(),
      getDemoBots: jest.fn(() => [{ id: 'test-bot', name: 'TestBot' }]),
      startActivitySimulation: jest.fn(),
      stopActivitySimulation: jest.fn(),
      getDemoStatus: jest.fn(() => ({ enabled: false, botCount: 0 })),
      reset: jest.fn(),
      getConversationManager: jest.fn(() => mockConversationManager),
    };

    service = new DemoModeService(mockStateService);
  });

  describe('detectDemoMode', () => {
    it('should delegate to state service', () => {
      const result = service.detectDemoMode();
      expect(mockStateService.detectDemoMode).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should delegate to state service', async () => {
      await service.initialize();
      expect(mockStateService.initialize).toHaveBeenCalled();
    });
  });

  describe('isInDemoMode', () => {
    it('should delegate to state service', () => {
      const result = service.isInDemoMode();
      expect(mockStateService.isInDemoMode).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('setDemoMode', () => {
    it('should delegate to state service', () => {
      service.setDemoMode(true);
      expect(mockStateService.setDemoMode).toHaveBeenCalledWith(true);
    });
  });

  describe('getDemoBots', () => {
    it('should return bots from state service', () => {
      const bots = service.getDemoBots();
      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe('TestBot');
    });
  });

  describe('startActivitySimulation', () => {
    it('should delegate to state service', () => {
      service.startActivitySimulation();
      expect(mockStateService.startActivitySimulation).toHaveBeenCalled();
    });
  });

  describe('stopActivitySimulation', () => {
    it('should delegate to state service', () => {
      service.stopActivitySimulation();
      expect(mockStateService.stopActivitySimulation).toHaveBeenCalled();
    });
  });

  describe('getDemoStatus', () => {
    it('should return status from state service', () => {
      const status = service.getDemoStatus();
      expect(status.enabled).toBe(false);
      expect(status.botCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should delegate to state service', () => {
      service.reset();
      expect(mockStateService.reset).toHaveBeenCalled();
    });
  });

  describe('getOrCreateConversation', () => {
    it('should delegate to conversation manager', () => {
      const conv = service.getOrCreateConversation('ch-1', 'BotA');
      expect(mockConversationManager.getOrCreateConversation).toHaveBeenCalledWith('ch-1', 'BotA');
      expect(conv.channelId).toBe('ch-1');
      expect(conv.botName).toBe('BotA');
    });
  });

  describe('addMessage', () => {
    it('should delegate to conversation manager with defaults', () => {
      const msg = service.addMessage('ch-1', 'BotA', 'Hello', 'incoming');
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        'ch-1',
        'BotA',
        'Hello',
        'incoming',
        'demo-user',
        'Demo User'
      );
      expect(msg.content).toBe('Hello');
    });

    it('should pass custom userId and userName', () => {
      service.addMessage('ch-1', 'BotA', 'Hi', 'outgoing', 'custom-user', 'Custom Name');
      expect(mockConversationManager.addMessage).toHaveBeenCalledWith(
        'ch-1',
        'BotA',
        'Hi',
        'outgoing',
        'custom-user',
        'Custom Name'
      );
    });
  });

  describe('getConversationHistory', () => {
    it('should delegate to conversation manager', () => {
      const history = service.getConversationHistory('ch-1', 'BotA');
      expect(mockConversationManager.getConversationHistory).toHaveBeenCalledWith('ch-1', 'BotA');
      expect(history).toEqual([]);
    });
  });

  describe('getAllConversations', () => {
    it('should delegate to conversation manager', () => {
      const convs = service.getAllConversations();
      expect(mockConversationManager.getAllConversations).toHaveBeenCalled();
      expect(convs).toEqual([]);
    });
  });

  describe('generateDemoResponse', () => {
    it('should delegate to conversation manager', () => {
      const response = service.generateDemoResponse('Hi', 'TestBot');
      expect(mockConversationManager.generateDemoResponse).toHaveBeenCalledWith('Hi', 'TestBot');
      expect(response).toBe('Response to: Hi');
    });
  });

  describe('deprecated methods', () => {
    it('getSimulatedMessageFlow should return empty array', () => {
      expect(service.getSimulatedMessageFlow()).toEqual([]);
    });

    it('getSimulatedAlerts should return empty array', () => {
      expect(service.getSimulatedAlerts()).toEqual([]);
    });

    it('getSimulatedPerformanceMetrics should return empty array', () => {
      expect(service.getSimulatedPerformanceMetrics()).toEqual([]);
    });
  });
});
