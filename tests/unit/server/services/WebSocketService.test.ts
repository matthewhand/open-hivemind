import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { BotConfigurationManager } from '../../../../src/config/BotConfigurationManager';
import { ActivityLogger } from '../../../../src/server/services/ActivityLogger';
import { BotMetricsService } from '../../../../src/server/services/BotMetricsService';
import { WebSocketService } from '../../../../src/server/services/WebSocketService';
import ApiMonitorService from '../../../../src/services/ApiMonitorService';

jest.mock('socket.io', () => ({
  Server: jest.fn(),
}));
jest.mock('../../../../src/config/BotConfigurationManager');
jest.mock('../../../../src/services/ApiMonitorService', () => {
  const mock = {
    on: jest.fn(),
    syncLlmEndpoints: jest.fn(),
    startAllMonitoring: jest.fn(),
    getAllStatuses: jest.fn().mockReturnValue([]),
    getOverallHealth: jest.fn().mockReturnValue({ status: 'healthy' }),
    getAllEndpoints: jest.fn().mockReturnValue([]),
    getInstance: jest.fn(),
  };
  mock.getInstance.mockReturnValue(mock);
  return { __esModule: true, default: mock };
});
jest.mock('../../../../src/server/services/ActivityLogger');
jest.mock('../../../../src/server/services/BotMetricsService');
jest.mock('tsyringe', () => {
  const actual = jest.requireActual('tsyringe');
  return {
    ...actual,
    container: {
      ...actual.container,
      resolve: jest.fn().mockReturnValue({
        on: jest.fn(),
        syncLlmEndpoints: jest.fn(),
        startAllMonitoring: jest.fn(),
        getAllStatuses: jest.fn().mockReturnValue([]),
        getOverallHealth: jest.fn().mockReturnValue({ status: 'healthy' }),
        getAllEndpoints: jest.fn().mockReturnValue([]),
      }),
    },
    injectable: () => (target: any) => target,
    singleton: () => (target: any) => target,
  };
});

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockHttpServer: HttpServer;
  let mockIo: jest.Mocked<SocketIOServer>;
  let mockSocket: any;
  let mockApiMonitor: jest.Mocked<ApiMonitorService>;
  let mockBotMetricsService: jest.Mocked<BotMetricsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (WebSocketService as any).instance = null;

    // Mock HTTP server
    mockHttpServer = {} as HttpServer;

    // Mock Socket.IO
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      disconnect: jest.fn(),
    };

    mockIo = {
      on: jest.fn(),
      emit: jest.fn(),
      sockets: {
        emit: jest.fn(),
        sockets: new Map([[mockSocket.id, mockSocket]]),
      },
      removeAllListeners: jest.fn(),
    } as any;

    (SocketIOServer as jest.Mock).mockReturnValue(mockIo);

    // Mock API Monitor
    mockApiMonitor = {
      on: jest.fn(),
      syncLlmEndpoints: jest.fn(),
      startAllMonitoring: jest.fn(),
      getAllStatuses: jest.fn().mockReturnValue([]),
      getOverallHealth: jest.fn().mockReturnValue({ status: 'healthy' }),
      getAllEndpoints: jest.fn().mockReturnValue([]),
    } as any;

    // Mock Bot Metrics
    mockBotMetricsService = {
      incrementMessageCount: jest.fn(),
      incrementErrorCount: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({ messageCount: 0, errorCount: 0 }),
      getAllMetrics: jest.fn().mockReturnValue({}),
    } as any;

    (BotMetricsService.getInstance as jest.Mock).mockReturnValue(mockBotMetricsService);

    // Mock Activity Logger
    (ActivityLogger.getInstance as jest.Mock).mockReturnValue({
      log: jest.fn(),
    });

    // Mock BotConfigurationManager
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
    });

    service = WebSocketService.getInstance();
  });

  afterEach(() => {
    service.shutdown();
    (WebSocketService as any).instance = null;
  });

  describe('initialization', () => {
    test('should initialize with HTTP server', () => {
      service.initialize(mockHttpServer);

      expect(SocketIOServer).toHaveBeenCalledWith(
        mockHttpServer,
        expect.objectContaining({
          path: '/webui/socket.io',
          cors: expect.any(Object),
        })
      );
    });

    test('should throw error when HTTP server is not provided', () => {
      expect(() => {
        service.initialize(null as any);
      }).toThrow('HTTP server is required');
    });

    test('should setup CORS configuration', () => {
      service.initialize(mockHttpServer);

      const corsConfig = (SocketIOServer as jest.Mock).mock.calls[0][1].cors;
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.methods).toContain('POST');
      expect(corsConfig.credentials).toBe(true);
    });

    test('should return singleton instance', () => {
      const instance1 = WebSocketService.getInstance();
      const instance2 = WebSocketService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('recordMessageFlow', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should record message flow event', () => {
      service.recordMessageFlow({
        botName: 'test-bot',
        provider: 'discord',
        channelId: 'channel-123',
        userId: 'user-123',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      const messages = service.getMessageFlow(10);
      expect(messages.length).toBe(1);
      expect(messages[0].botName).toBe('test-bot');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeDefined();
    });

    test('should broadcast message to connected clients', () => {
      service.recordMessageFlow({
        botName: 'test-bot',
        provider: 'discord',
        channelId: 'channel-123',
        userId: 'user-123',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      expect(mockIo.emit).toHaveBeenCalledWith(
        'message_flow_update',
        expect.objectContaining({ botName: 'test-bot' })
      );
    });

    test('should increment bot message count', () => {
      service.recordMessageFlow({
        botName: 'test-bot',
        provider: 'discord',
        channelId: 'channel-123',
        userId: 'user-123',
        messageType: 'incoming',
        contentLength: 100,
        status: 'success',
      });

      expect(mockBotMetricsService.incrementMessageCount).toHaveBeenCalledWith('test-bot');
    });

    test('should limit stored messages to 1000', () => {
      for (let i = 0; i < 1100; i++) {
        service.recordMessageFlow({
          botName: `bot-${i}`,
          provider: 'discord',
          channelId: 'channel-123',
          userId: 'user-123',
          messageType: 'incoming',
          contentLength: 100,
          status: 'success',
        });
      }

      const messages = service.getMessageFlow(2000);
      expect(messages.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('recordAlert', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should record alert', () => {
      service.recordAlert({
        level: 'error',
        title: 'Test Alert',
        message: 'Something went wrong',
      });

      const alerts = service.getAlerts(10);
      expect(alerts.length).toBe(1);
      expect(alerts[0].title).toBe('Test Alert');
      expect(alerts[0].status).toBe('active');
    });

    test('should broadcast alert to connected clients', () => {
      service.recordAlert({
        level: 'warning',
        title: 'Warning Alert',
        message: 'Warning message',
      });

      expect(mockIo.emit).toHaveBeenCalledWith(
        'alert_update',
        expect.objectContaining({ title: 'Warning Alert' })
      );
    });

    test('should increment error count for error-level alerts', () => {
      service.recordAlert({
        level: 'error',
        title: 'Error Alert',
        message: 'Error message',
        botName: 'test-bot',
      });

      expect(mockBotMetricsService.incrementErrorCount).toHaveBeenCalledWith('test-bot');
    });

    test('should track per-bot errors', () => {
      service.recordAlert({
        level: 'error',
        title: 'Error 1',
        message: 'Error message 1',
        botName: 'bot-1',
      });

      const stats = service.getBotStats('bot-1');
      expect(stats.errors.length).toBeGreaterThan(0);
    });

    test('should limit stored alerts to 500', () => {
      for (let i = 0; i < 550; i++) {
        service.recordAlert({
          level: 'info',
          title: `Alert ${i}`,
          message: `Message ${i}`,
        });
      }

      const alerts = service.getAlerts(1000);
      expect(alerts.length).toBeLessThanOrEqual(500);
    });

    test('should cap per-bot error list at 20', () => {
      for (let i = 0; i < 30; i++) {
        service.recordAlert({
          level: 'error',
          title: `Error ${i}`,
          message: `Message ${i}`,
          botName: 'test-bot',
        });
      }

      const stats = service.getBotStats('test-bot');
      expect(stats.errors.length).toBeLessThanOrEqual(20);
    });
  });

  describe('alert management', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should acknowledge alert', () => {
      service.recordAlert({
        level: 'warning',
        title: 'Test Alert',
        message: 'Test message',
      });

      const alerts = service.getAlerts(1);
      const alertId = alerts[0].id;

      const result = service.acknowledgeAlert(alertId);

      expect(result).toBe(true);
      const updatedAlerts = service.getAlerts(1);
      expect(updatedAlerts[0].status).toBe('acknowledged');
      expect(updatedAlerts[0].acknowledgedAt).toBeDefined();
    });

    test('should return false when acknowledging non-existent alert', () => {
      const result = service.acknowledgeAlert('non-existent-id');
      expect(result).toBe(false);
    });

    test('should resolve alert', () => {
      service.recordAlert({
        level: 'error',
        title: 'Test Alert',
        message: 'Test message',
      });

      const alerts = service.getAlerts(1);
      const alertId = alerts[0].id;

      const result = service.resolveAlert(alertId);

      expect(result).toBe(true);
      const updatedAlerts = service.getAlerts(1);
      expect(updatedAlerts[0].status).toBe('resolved');
      expect(updatedAlerts[0].resolvedAt).toBeDefined();
    });
  });

  describe('message acknowledgment system', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should send tracked message', () => {
      const envelope = service.sendTrackedMessage('test_event', { data: 'test' }, 'default');

      expect(envelope.messageId).toBeDefined();
      expect(envelope.sequenceNumber).toBe(1);
      expect(envelope.event).toBe('test_event');
      expect(envelope.payload).toEqual({ data: 'test' });
      expect(mockIo.emit).toHaveBeenCalledWith('tracked_message', envelope);
    });

    test('should increment sequence numbers', () => {
      const env1 = service.sendTrackedMessage('event1', {}, 'channel-1');
      const env2 = service.sendTrackedMessage('event2', {}, 'channel-1');
      const env3 = service.sendTrackedMessage('event3', {}, 'channel-2');

      expect(env1.sequenceNumber).toBe(1);
      expect(env2.sequenceNumber).toBe(2);
      expect(env3.sequenceNumber).toBe(1); // Different channel
    });

    test('should handle acknowledgment', () => {
      const envelope = service.sendTrackedMessage('test_event', { data: 'test' });

      const result = service.handleAck({ messageId: envelope.messageId });

      expect(result).toBe(true);

      const stats = service.getDeliveryStats();
      expect(stats.totalAcknowledged).toBe(1);
    });

    test('should return false when acknowledging non-existent message', () => {
      const result = service.handleAck({ messageId: 'non-existent-id' });
      expect(result).toBe(false);
    });

    test('should handle missed messages request', () => {
      service.sendTrackedMessage('event1', { data: '1' }, 'channel-1');
      service.sendTrackedMessage('event2', { data: '2' }, 'channel-1');
      service.sendTrackedMessage('event3', { data: '3' }, 'channel-1');

      const missed = service.handleRequestMissed({ channel: 'channel-1', lastSequence: 1 });

      expect(missed.length).toBe(2);
      expect(missed[0].sequenceNumber).toBe(2);
      expect(missed[1].sequenceNumber).toBe(3);
    });

    test('should return delivery stats', () => {
      service.sendTrackedMessage('event1', {});
      service.sendTrackedMessage('event2', {});

      const stats = service.getDeliveryStats();

      expect(stats.totalSent).toBeGreaterThanOrEqual(2);
      expect(stats.pendingCount).toBeGreaterThan(0);
      expect(stats.deliverySuccessRate).toBeDefined();
    });

    test('should get sequence number for channel', () => {
      service.sendTrackedMessage('event1', {}, 'channel-1');
      service.sendTrackedMessage('event2', {}, 'channel-1');

      const seqNum = service.getSequenceNumber('channel-1');
      expect(seqNum).toBe(2);
    });

    test('should return 0 for new channel', () => {
      const seqNum = service.getSequenceNumber('new-channel');
      expect(seqNum).toBe(0);
    });
  });

  describe('bot statistics', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should get stats for specific bot', () => {
      mockBotMetricsService.getMetrics.mockReturnValue({
        messageCount: 10,
        errorCount: 2,
      });

      service.recordAlert({
        level: 'error',
        title: 'Error',
        message: 'msg',
        botName: 'test-bot',
      });

      const stats = service.getBotStats('test-bot');

      expect(stats.messageCount).toBe(10);
      expect(stats.errorCount).toBe(2);
      expect(stats.errors.length).toBeGreaterThan(0);
    });

    test('should get stats for all bots', () => {
      mockBotMetricsService.getAllMetrics.mockReturnValue({
        'bot-1': { messageCount: 5, errorCount: 1 },
        'bot-2': { messageCount: 3, errorCount: 0 },
      });

      const allStats = service.getAllBotStats();

      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['bot-1'].messageCount).toBe(5);
      expect(allStats['bot-2'].messageCount).toBe(3);
    });
  });

  describe('broadcast methods', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should broadcast config change', () => {
      service.broadcastConfigChange();

      expect(mockIo.emit).toHaveBeenCalledWith(
        'config_changed',
        expect.objectContaining({ timestamp: expect.any(String) })
      );
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      service.initialize(mockHttpServer);
    });

    test('should clear metrics interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should disconnect all sockets', () => {
      service.shutdown();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test('should clear pending acknowledgment timers', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      service.sendTrackedMessage('event', {});
      service.shutdown();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('should clear all collections', () => {
      service.sendTrackedMessage('event', {});
      service.recordAlert({ level: 'info', title: 'Test', message: 'msg' });

      service.shutdown();

      // After shutdown, stats should be reset
      const stats = service.getDeliveryStats();
      expect(stats.pendingCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should handle initialization without connected clients', () => {
      service.initialize(mockHttpServer);

      service.recordMessageFlow({
        botName: 'test-bot',
        provider: 'discord',
        channelId: 'channel',
        userId: 'user',
        messageType: 'incoming',
        contentLength: 10,
        status: 'success',
      });

      expect(mockIo.emit).toHaveBeenCalled();
    });

    test('should handle empty message flow', () => {
      const messages = service.getMessageFlow(10);
      expect(messages).toEqual([]);
    });

    test('should handle empty alerts', () => {
      const alerts = service.getAlerts(10);
      expect(alerts).toEqual([]);
    });

    test('should handle stats for non-existent bot', () => {
      const stats = service.getBotStats('non-existent-bot');
      expect(stats.messageCount).toBe(0);
      expect(stats.errors).toEqual([]);
    });
  });
});
