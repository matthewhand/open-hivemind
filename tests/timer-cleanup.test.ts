/**
 * Test suite to verify all timers have proper cleanup
 */

describe('Timer Cleanup Tests', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('BotMetricsService', () => {
    it('should clear interval on stop', () => {
      const { BotMetricsService } = require('../src/server/services/BotMetricsService');
      const service = BotMetricsService.getInstance();

      // Wait for initialization
      jest.runAllTimers();

      // Stop the service
      service.stop();

      // Verify no timers are pending
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('WebSocketService', () => {
    it('should clear metricsInterval on shutdown', () => {
      const { WebSocketService } = require('../src/server/services/WebSocketService');
      const service = WebSocketService.getInstance();

      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('RealTimeValidationService', () => {
    it('should clear validationInterval on shutdown', () => {
      const {
        RealTimeValidationService,
      } = require('../src/server/services/RealTimeValidationService');
      const service = RealTimeValidationService.getInstance();

      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('ApiMonitorService', () => {
    it('should stop all monitoring intervals on shutdown', () => {
      const ApiMonitorService = require('../src/services/ApiMonitorService').default;
      const service = ApiMonitorService.getInstance();

      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('AnomalyDetectionService', () => {
    it('should clear detection interval on shutdown', () => {
      const AnomalyDetectionService = require('../src/services/AnomalyDetectionService').default;
      const service = AnomalyDetectionService.getInstance();

      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('MetricsCollector', () => {
    it('should stop collection interval on shutdown', () => {
      const { MetricsCollector } = require('../src/monitoring/MetricsCollector');
      const service = MetricsCollector.getInstance();

      service.startCollection();
      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('IntegrationAnomalyDetector', () => {
    it('should clear check interval on shutdown', () => {
      const {
        IntegrationAnomalyDetector,
      } = require('../src/monitoring/IntegrationAnomalyDetector');
      const service = IntegrationAnomalyDetector.getInstance();

      service.startDetection();
      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('ProviderMetricsCollector', () => {
    it('should clear all monitoring intervals on shutdown', () => {
      const { ProviderMetricsCollector } = require('../src/monitoring/ProviderMetricsCollector');
      const service = ProviderMetricsCollector.getInstance();

      service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('MCPProviderManager', () => {
    it('should stop all health check intervals on shutdown', async () => {
      const { MCPProviderManager } = require('../src/config/MCPProviderManager');
      const manager = new MCPProviderManager();

      await manager.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('QuotaStore', () => {
    it('should clear cleanup timer on shutdown', () => {
      const { InMemoryQuotaStore } = require('../src/services/QuotaStore');
      const store = new InMemoryQuotaStore();

      store.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('PerformanceProfiler', () => {
    it('should clear cleanup interval on destroy', () => {
      const { PerformanceProfiler } = require('../src/utils/PerformanceProfiler');
      const profiler = PerformanceProfiler.getInstance();

      profiler.destroy();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('TimerRegistry', () => {
    it('should clear all timers on clearAll', () => {
      const { TimerRegistry } = require('../src/utils/TimerRegistry');
      const registry = TimerRegistry.getInstance();

      // Register some timers
      registry.registerTimeout('test1', () => {}, 1000);
      registry.registerInterval('test2', () => {}, 1000);

      // Clear all
      registry.clearAll();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('IdleResponseManager', () => {
    it('should clear all channel timers on shutdown', () => {
      const { IdleResponseManager } = require('../src/message/management/IdleResponseManager');
      const manager = IdleResponseManager.getInstance();

      manager.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('UsageTrackerService', () => {
    it('should clear saveTimeout on shutdown', async () => {
      const { UsageTrackerService } = require('../src/server/services/UsageTrackerService');
      const service = UsageTrackerService.getInstance();

      await service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('ToolPreferencesService', () => {
    it('should clear saveTimeout on shutdown', async () => {
      const { ToolPreferencesService } = require('../src/server/services/ToolPreferencesService');
      const service = ToolPreferencesService.getInstance();

      await service.shutdown();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Rate Limiter', () => {
    it('should shutdown all memory stores', () => {
      const { shutdownRateLimiter } = require('../src/middleware/rateLimiter');

      shutdownRateLimiter();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('CSRF Middleware', () => {
    it('should stop token cleanup interval', () => {
      const { stopTokenCleanup } = require('../src/server/middleware/csrf');

      stopTokenCleanup();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('ReconnectionManager', () => {
    it('should clear reconnect timer on stop', () => {
      const { ReconnectionManager } = require('../src/providers/ReconnectionManager');
      const manager = new ReconnectionManager('test', async () => {});

      manager.stop();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
