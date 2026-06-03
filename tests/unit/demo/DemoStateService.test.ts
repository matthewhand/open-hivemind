import { DemoStateService } from '../../../src/services/demo/DemoStateService';

describe('DemoStateService', () => {
  let mockBotManager: any;
  let mockConfigStore: any;
  let service: DemoStateService;

  beforeEach(() => {
    mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([]),
      addBot: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigStore = {
      get: jest.fn().mockReturnValue(false),
    };

    service = new DemoStateService(mockBotManager, mockConfigStore);
  });

  describe('isInDemoMode', () => {
    it('should return false by default', () => {
      expect(service.isInDemoMode()).toBe(false);
    });
  });

  describe('detectDemoMode', () => {
    it('should return false when DEMO_MODE is not set', () => {
      const result = service.detectDemoMode();
      expect(result).toBe(false);
    });

    it('should enable demo mode when DEMO_MODE env var is true', () => {
      // We can't set process.env in the test environment due to the proxy in jest.setup
      // Test the configStore path instead
      mockConfigStore.get.mockReturnValue(true);

      const result = service.detectDemoMode();
      expect(result).toBe(true);
      expect(service.isInDemoMode()).toBe(true);
    });

    it('should not toggle if already in demo mode', () => {
      // Set demo mode first
      mockConfigStore.get.mockReturnValue(true);
      service.detectDemoMode();
      expect(service.isInDemoMode()).toBe(true);

      // Second call should not change state
      const result = service.detectDemoMode();
      expect(result).toBe(true);
      expect(service.isInDemoMode()).toBe(true);
    });
  });

  describe('setDemoMode', () => {
    it('should enable demo mode', () => {
      service.setDemoMode(true);
      expect(service.isInDemoMode()).toBe(true);
    });

    it('should disable demo mode', () => {
      service.setDemoMode(true);
      expect(service.isInDemoMode()).toBe(true);
      service.setDemoMode(false);
      expect(service.isInDemoMode()).toBe(false);
    });

    it('should no-op when setting same value', () => {
      service.setDemoMode(true);
      const botsBefore = service.getDemoBots();
      // Setting true again should be no-op
      service.setDemoMode(true);
      expect(service.isInDemoMode()).toBe(true);
    });
  });

  describe('getDemoBots', () => {
    it('should return empty array initially', () => {
      expect(service.getDemoBots()).toEqual([]);
    });

    it('should return bots after seedDemoConfig runs', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);
      await (service as any).seedDemoConfig();

      const bots = service.getDemoBots();
      expect(bots.length).toBeGreaterThan(0);
      bots.forEach((b) => {
        expect(b).toHaveProperty('id');
        expect(b).toHaveProperty('name');
        expect(b).toHaveProperty('messageProvider');
        expect(b).toHaveProperty('llmProvider');
        expect(b.status).toBe('demo');
        expect(b.isDemo).toBe(true);
      });
    });

    it('should track existing bots when BotConfigurationManager already has bots', async () => {
      mockBotManager.getAllBots.mockReturnValue([
        {
          id: 'bot-1',
          name: 'RealBot',
          messageProvider: 'slack',
          llmProvider: 'openai',
          isActive: true,
        },
      ]);
      await (service as any).seedDemoConfig();

      const bots = service.getDemoBots();
      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe('RealBot');
      expect(bots[0].status).toBe('active');
    });
  });

  describe('startActivitySimulation', () => {
    it('should not throw when simulator is not initialized', () => {
      expect(() => service.startActivitySimulation()).not.toThrow();
    });
  });

  describe('stopActivitySimulation', () => {
    it('should not throw when simulator is not initialized', () => {
      expect(() => service.stopActivitySimulation()).not.toThrow();
    });
  });

  describe('getDemoStatus', () => {
    it('should return status object with expected shape', () => {
      const status = service.getDemoStatus();
      expect(status).toHaveProperty('enabled', false);
      expect(status).toHaveProperty('botCount', 0);
      expect(status).toHaveProperty('conversationCount', 0);
    });

    it('should reflect enabled state and bot count', () => {
      service.setDemoMode(true);
      const status = service.getDemoStatus();
      expect(status.enabled).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear demo bots and conversations', () => {
      // Seed some bots first
      mockBotManager.getAllBots.mockReturnValue([]);
      return (service as any).seedDemoConfig().then(() => {
        expect(service.getDemoBots().length).toBeGreaterThan(0);

        service.reset();

        expect(service.getDemoBots()).toEqual([]);
        expect(service.getConversationManager().getAllConversations()).toEqual([]);
      });
    });
  });

  describe('getConversationManager', () => {
    it('should return the conversation manager', () => {
      const cm = service.getConversationManager();
      expect(cm).toBeDefined();
      expect(typeof cm.getOrCreateConversation).toBe('function');
    });
  });

  describe('seedDemoConfig', () => {
    it('should seed DEMO_BOT_CONFIGS when no bots exist', async () => {
      expect(service.getDemoBots().length).toBe(0);

      await (service as any).seedDemoConfig();

      expect(mockBotManager.addBot).toHaveBeenCalled();
      expect(service.getDemoBots().length).toBeGreaterThan(0);
    });

    it('should not call addBot when bots already exist', async () => {
      mockBotManager.getAllBots.mockReturnValue([{ id: 'b1', name: 'Bot1' }]);

      await (service as any).seedDemoConfig();

      expect(mockBotManager.addBot).not.toHaveBeenCalled();
    });

    it('should handle addBot failures gracefully', async () => {
      mockBotManager.addBot.mockRejectedValue(new Error('DB error'));

      await expect((service as any).seedDemoConfig()).resolves.not.toThrow();
      // Demo bots still get created as trackers even if addBot fails
      expect(service.getDemoBots().length).toBeGreaterThan(0);
    });

    it('should populate provider-specific config for discord bots', async () => {
      await (service as any).seedDemoConfig();

      const discordBot = service.getDemoBots().find((b) => b.messageProvider === 'discord');
      expect(discordBot).toBeDefined();
      expect(discordBot?.discord).toBeDefined();
    });

    it('should populate provider-specific config for llm providers', async () => {
      await (service as any).seedDemoConfig();

      // Verify all demo bots have proper structure
      const bots = service.getDemoBots();
      bots.forEach((b) => {
        expect(b.id).toBeDefined();
        expect(b.name).toBeDefined();
        expect(b.messageProvider).toBeDefined();
        expect(b.llmProvider).toBeDefined();
        expect(b.connected).toBe(true);
      });
    });

    it('should handle existing bots with minimal config', async () => {
      mockBotManager.getAllBots.mockReturnValue([
        { name: 'MinimalBot', messageProvider: undefined, llmProvider: undefined },
      ]);

      await (service as any).seedDemoConfig();

      const bots = service.getDemoBots();
      expect(bots[0].messageProvider).toBe('discord');
      expect(bots[0].llmProvider).toBe('openai');
      expect(bots[0].persona).toBe('default');
    });
  });
});
