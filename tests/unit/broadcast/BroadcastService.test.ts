import { BroadcastService } from '../../../src/server/services/websocket/BroadcastService';
import { ConnectionManager } from '../../../src/server/services/websocket/ConnectionManager';
import { DeliveryStatus } from '../../../src/types/websocket';

jest.mock('../../../src/common/auditLogger', () => ({
  AuditLogger: {
    getInstance: () => ({
      on: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: () =>
      Promise.resolve({
        on: jest.fn(),
      }),
  },
}));

jest.mock('../../../src/config/BotConfigurationManager', () => {
  const bots: any[] = [];
  return {
    BotConfigurationManager: {
      getInstance: () => ({
        getAllBots: () => bots,
        getWarnings: () => [],
        setBots: (b: any[]) => {
          bots.length = 0;
          bots.push(...b);
        },
      }),
    },
  };
});

jest.mock('../../../src/events/MessageBus', () => ({
  MessageBus: {
    getInstance: () => ({
      on: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/server/services/BotMetricsService', () => ({
  BotMetricsService: {
    getInstance: () => ({
      on: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/services/DemoModeService', () => ({}));

jest.mock('../../../src/services/ApiMonitorService', () => {
  const EventEmitter = require('events');
  class MockApiMonitor extends EventEmitter {
    getAllStatuses = jest.fn().mockReturnValue([]);
    getOverallHealth = jest.fn().mockReturnValue('healthy');
    getAllEndpoints = jest.fn().mockReturnValue([]);
  }
  return MockApiMonitor;
});

describe('BroadcastService', () => {
  let connectionManager: any;
  let mockApiMonitor: any;
  let broadcastService: BroadcastService;

  beforeEach(() => {
    const { BotConfigurationManager } = require('../../../src/config/BotConfigurationManager');
    BotConfigurationManager.getInstance().setBots([]);

    connectionManager = {
      getIo: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };

    mockApiMonitor = new (require('../../../src/services/ApiMonitorService'))();

    broadcastService = new BroadcastService(connectionManager, mockApiMonitor, {} as any);
  });

  describe('recordMessageFlow', () => {
    it('should record and broadcast a message flow event', () => {
      const event: any = {
        botName: 'TestBot',
        provider: 'discord',
        channelId: 'ch-1',
        userId: 'u-1',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      };

      broadcastService.recordMessageFlow(event);

      const flow = broadcastService.getMessageFlow();
      expect(flow).toHaveLength(1);
      expect(flow[0].botName).toBe('TestBot');
    });
  });

  describe('recordAlert', () => {
    it('should record and broadcast an alert', () => {
      broadcastService.recordAlert({
        level: 'warning',
        title: 'Test Alert',
        message: 'Something happened',
      });

      const alerts = broadcastService.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe('Test Alert');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert and broadcast the event', () => {
      broadcastService.recordAlert({
        level: 'warning',
        title: 'Test Alert',
        message: 'Something happened',
      });

      const alertId = broadcastService.getAlerts()[0].id;
      const result = broadcastService.acknowledgeAlert(alertId);

      expect(result).toBe(true);
    });

    it('should return false for unknown alert', () => {
      expect(broadcastService.acknowledgeAlert('nonexistent')).toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert and broadcast the event', () => {
      broadcastService.recordAlert({
        level: 'warning',
        title: 'Test Alert',
        message: 'Something happened',
      });

      const alertId = broadcastService.getAlerts()[0].id;
      const result = broadcastService.resolveAlert(alertId);

      expect(result).toBe(true);
    });

    it('should return false for unknown alert', () => {
      expect(broadcastService.resolveAlert('nonexistent')).toBe(false);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return metrics from MetricCalculator', () => {
      const metrics = broadcastService.getPerformanceMetrics();
      expect(metrics).toEqual([]);
    });

    it('should respect the limit parameter', () => {
      const metrics = broadcastService.getPerformanceMetrics(5);
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('getMessageRateHistory', () => {
    it('should reflect recent message flow rate', () => {
      broadcastService.recordMessageFlow({
        botName: 'TestBot',
        provider: 'discord',
        channelId: 'ch-1',
        userId: 'u-1',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      const history = broadcastService.getMessageRateHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history[history.length - 1]).toBeGreaterThan(0);
    });
  });

  describe('getBotStats', () => {
    it('should return stats for a specific bot', () => {
      broadcastService.recordMessageFlow({
        botName: 'TestBot',
        provider: 'discord',
        channelId: 'ch-1',
        userId: 'u-1',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      const stats = broadcastService.getBotStats('TestBot');
      expect(stats.messageCount).toBe(1);
      expect(stats.errorCount).toBe(0);
    });

    it('should return zero-count stats for unknown bot', () => {
      const stats = broadcastService.getBotStats('UnknownBot');
      expect(stats.messageCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('getAllBotStats', () => {
    it('should return bot name keys with messageCount and errorCount', () => {
      const { BotConfigurationManager } = require('../../../src/config/BotConfigurationManager');
      BotConfigurationManager.getInstance().setBots([{ name: 'BotA' }, { name: 'BotB' }]);

      broadcastService.recordMessageFlow({
        botName: 'BotA',
        provider: 'discord',
        channelId: 'ch-1',
        userId: 'u-1',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      const stats = broadcastService.getAllBotStats();
      expect(Object.keys(stats)).toContain('BotA');
      expect(Object.keys(stats)).toContain('BotB');
      expect(stats.BotA.messageCount).toBe(1);
      expect(stats.BotA.errorCount).toBe(0);
      expect(stats.BotB.messageCount).toBe(0);
    });
  });

  describe('broadcastSystemMetrics', () => {
    it('should delegate to distributor', () => {
      expect(() => broadcastService.broadcastSystemMetrics(5)).not.toThrow();
    });
  });

  describe('broadcastMonitoringData', () => {
    it('should delegate to distributor', () => {
      expect(() => broadcastService.broadcastMonitoringData(5)).not.toThrow();
    });
  });

  describe('sendTrackedMessage', () => {
    it('should create a tracked message envelope', () => {
      const envelope = broadcastService.sendTrackedMessage('test_event', { data: 'hello' });
      expect(envelope).toBeDefined();
      expect((envelope as any).deliveryStatus).toBe(DeliveryStatus.SENT);
    });
  });

  describe('handleAck', () => {
    it('should delegate to messageTracker', () => {
      const envelope = broadcastService.sendTrackedMessage('test_event', { data: 'hello' });
      const result = broadcastService.handleAck({ messageId: (envelope as any).id } as any);
      expect(result).toBe(true);
    });

    it('should return false for unknown message id', () => {
      expect(broadcastService.handleAck({ messageId: 'unknown' } as any)).toBe(false);
    });
  });

  describe('configureAck', () => {
    it('should not throw', () => {
      expect(() =>
        broadcastService.configureAck({ enabled: true, messageTimeoutMs: 5000 })
      ).not.toThrow();
    });
  });

  describe('handleRequestMissed', () => {
    it('should return missed messages', () => {
      broadcastService.sendTrackedMessage('e1', {}, 'main');
      broadcastService.sendTrackedMessage('e2', {}, 'main');

      const missed = broadcastService.handleRequestMissed({
        channel: 'main',
        lastSequence: 0,
      } as any);

      expect(missed).toHaveLength(2);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', () => {
      const stats = broadcastService.getDeliveryStats();
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalAcknowledged');
      expect(stats).toHaveProperty('pendingCount');
    });
  });

  describe('shutdown', () => {
    it('should clear event store and message tracker', () => {
      broadcastService.recordMessageFlow({
        botName: 'Bot',
        provider: 'discord',
        channelId: 'ch',
        userId: 'u',
        messageType: 'incoming',
        contentLength: 1,
        status: 'success',
      });

      broadcastService.shutdown();

      expect(broadcastService.getMessageFlow()).toEqual([]);
    });
  });

  describe('getApiMonitorService', () => {
    it('should return the api monitor service', () => {
      expect(broadcastService.getApiMonitorService()).toBe(mockApiMonitor);
    });
  });

  describe('setApiMonitorService', () => {
    it('should replace the api monitor service', () => {
      const newService = { getAllStatuses: () => [] } as any;
      broadcastService.setApiMonitorService(newService);
      expect(broadcastService.getApiMonitorService()).toBe(newService);
    });
  });
});
