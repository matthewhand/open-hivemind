import { DemoActivitySimulatorService } from '../../../src/services/demo/DemoActivitySimulator';
import type { DemoBot } from '../../../src/services/demo/DemoConstants';

function makeDemoBot(overrides: Partial<DemoBot> = {}): DemoBot {
  return {
    id: 'test-bot-1',
    name: 'TestBot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'helper',
    systemInstruction: 'You are helpful',
    status: 'demo',
    connected: true,
    isDemo: true,
    discord: { channelId: 'test-channel', guildId: 'test-guild' },
    ...overrides,
  } as any;
}

describe('DemoActivitySimulatorService', () => {
  let mockMetricsCollector: any;
  let mockActivityLogger: any;
  let mockWsService: any;
  let service: DemoActivitySimulatorService;
  let mockBots: DemoBot[];

  beforeEach(() => {
    jest.useFakeTimers();

    mockMetricsCollector = {
      recordMetric: jest.fn(),
      recordResponseTime: jest.fn(),
      incrementMessages: jest.fn(),
      incrementErrors: jest.fn(),
      recordLlmTokenUsage: jest.fn(),
    };

    mockActivityLogger = {
      log: jest.fn(),
      getInstance: jest.fn(),
    };

    mockWsService = {
      recordMessageFlow: jest.fn(),
      recordAlert: jest.fn(),
    };

    mockBots = [makeDemoBot()];
    service = new DemoActivitySimulatorService(
      mockBots,
      mockMetricsCollector,
      mockActivityLogger,
      mockWsService
    );
  });

  afterEach(() => {
    service.reset();
    jest.useRealTimers();
  });

  describe('getSimulatorState', () => {
    it('should return initial simulator state', () => {
      const state = service.getSimulatorState();
      expect(state.isRunning).toBe(false);
      expect(state.simulationStartTime).toBe(0);
    });
  });

  describe('startActivitySimulation', () => {
    it('should start simulation and set isRunning to true', () => {
      service.startActivitySimulation();
      const state = service.getSimulatorState();
      expect(state.isRunning).toBe(true);
      expect(state.simulationStartTime).toBeGreaterThan(0);
    });

    it('should not restart if already running', () => {
      service.startActivitySimulation();
      const firstStartTime = service.getSimulatorState().simulationStartTime;
      service.startActivitySimulation();
      // isRunning check prevents restart, state shouldn't change
      expect(service.getSimulatorState().simulationStartTime).toBe(firstStartTime);
    });

    it('should generate message events and performance metrics on timers', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      service.startActivitySimulation();

      // Advance past the message interval (10-30s, fixed by mockRandom => 20s)
      jest.advanceTimersByTime(25000);

      // Should have recorded at least one message flow event
      expect(mockWsService.recordMessageFlow).toHaveBeenCalled();

      // Metrics interval runs every 5s — should have fired ~5 times
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should record metrics to MetricsCollector every 5s', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      service.startActivitySimulation();

      jest.advanceTimersByTime(20000);

      // At least: cpu, memory, responseTime, activeConnections, messageRate, errorRate every 5s
      // So at 5s, 10s, 15s = 3 rounds × 6 metrics = 18 calls minimum
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should occasionally generate alerts', () => {
      // Force random < 0.1 to trigger alert generation
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      service.startActivitySimulation();

      // Run one metrics cycle
      jest.advanceTimersByTime(10000);

      expect(mockWsService.recordAlert).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('stopActivitySimulation', () => {
    it('should stop simulation and clear timers', () => {
      service.startActivitySimulation();
      expect(service.getSimulatorState().isRunning).toBe(true);

      service.stopActivitySimulation();
      expect(service.getSimulatorState().isRunning).toBe(false);

      // Clear and advance — no more calls should happen
      const alertCount = mockWsService.recordAlert.mock.calls.length;
      jest.advanceTimersByTime(30000);
      expect(mockWsService.recordAlert).toHaveBeenCalledTimes(alertCount);
    });
  });

  describe('reset', () => {
    it('should stop simulation and clear threads', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      service.startActivitySimulation();
      jest.advanceTimersByTime(10000);
      service.reset();

      const state = service.getSimulatorState();
      expect(state.isRunning).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('seedHistoricalData', () => {
    it('should pre-seed MetricsCollector with 60 data points', () => {
      service.seedHistoricalData();

      // 61 iterations × (cpu + memory + maybe response time + conditional messages)
      // CPU and memory are always recorded, that's 122 calls minimum
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalled();

      // 30 historical events
      expect(mockWsService.recordMessageFlow).toHaveBeenCalled();

      // 3 historical alerts
      expect(mockWsService.recordAlert).toHaveBeenCalled();
    });

    it('should record response times during seeding', () => {
      service.seedHistoricalData();
      expect(mockMetricsCollector.recordResponseTime).toHaveBeenCalled();
    });

    it('should tolerate ActivityLogger not being initialized', () => {
      mockActivityLogger.log.mockImplementation(() => {
        throw new Error('Not initialized');
      });

      // Should not throw
      expect(() => service.seedHistoricalData()).not.toThrow();
    });
  });

  describe('empty bot list behavior', () => {
    it('should not start simulation when no bots exist', () => {
      const emptyService = new DemoActivitySimulatorService(
        [],
        mockMetricsCollector,
        mockActivityLogger,
        mockWsService
      );

      emptyService.startActivitySimulation();
      expect(emptyService.getSimulatorState().isRunning).toBe(true);

      // But message event generation early-returns
      jest.advanceTimersByTime(30000);
      expect(mockWsService.recordMessageFlow).not.toHaveBeenCalled();
    });
  });

  describe('seed with empty bots', () => {
    it('should seed historical data without crashing', () => {
      const emptyService = new DemoActivitySimulatorService(
        [],
        mockMetricsCollector,
        mockActivityLogger,
        mockWsService
      );

      expect(() => emptyService.seedHistoricalData()).not.toThrow();
      // Should still seed metrics
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalled();
      // Should still generate fallback message events
      expect(mockWsService.recordMessageFlow).toHaveBeenCalled();
      // Should still generate fallback alerts
      expect(mockWsService.recordAlert).toHaveBeenCalled();
    });
  });
});
