import { BroadcastDistributor } from '../../../src/server/services/websocket/broadcast/BroadcastDistributor';
import { DeliveryStatus } from '../../../src/types/websocket';

describe('BroadcastDistributor', () => {
  let mockConnectionManager: any;
  let mockEventStore: any;
  let mockMetricCalculator: any;
  let mockMessageTracker: any;
  let mockIo: any;
  let distributor: BroadcastDistributor;

  beforeEach(() => {
    mockIo = {
      emit: jest.fn(),
    };

    mockConnectionManager = {
      getIo: jest.fn().mockReturnValue(mockIo),
    };

    mockEventStore = {
      getAlerts: jest.fn().mockReturnValue([{ id: 'alert-1', level: 'warning' }]),
      getMessageFlow: jest.fn().mockReturnValue([{ id: 'msg-1', botName: 'TestBot' }]),
    };

    mockMetricCalculator = {
      calculateSystemMetric: jest.fn().mockReturnValue({
        timestamp: new Date().toISOString(),
        cpuUsage: 25,
        memoryUsage: 60,
        activeConnections: 5,
        messageRate: 3,
        errorRate: 0.02,
        responseTime: 150,
      }),
    };

    mockMessageTracker = {
      getNextSequence: jest.fn().mockReturnValue(1),
      trackMessage: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalSent: 100,
        totalAcknowledged: 95,
        totalTimedOut: 3,
        totalFailed: 2,
        pendingCount: 0,
        averageAckLatencyMs: 450,
        successRate: 0.95,
      }),
    };

    distributor = new BroadcastDistributor(
      mockConnectionManager,
      mockEventStore,
      mockMetricCalculator,
      mockMessageTracker
    );
  });

  describe('broadcast', () => {
    it('should emit to all connected clients via io.emit', () => {
      const payload = { data: 'test' };
      distributor.broadcast('test_event', payload);

      expect(mockIo.emit).toHaveBeenCalledWith('test_event', payload);
    });

    it('should not throw if io is not available', () => {
      mockConnectionManager.getIo.mockReturnValue(null);

      expect(() => {
        distributor.broadcast('test_event', {});
      }).not.toThrow();
    });
  });

  describe('broadcastSystemMetrics', () => {
    it('should broadcast system metrics event', () => {
      distributor.broadcastSystemMetrics(5);

      expect(mockMetricCalculator.calculateSystemMetric).toHaveBeenCalledWith(5);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'system_metrics',
        expect.objectContaining({
          cpuUsage: 25,
        })
      );
    });
  });

  describe('broadcastMonitoringData', () => {
    it('should broadcast monitoring dashboard update', () => {
      distributor.broadcastMonitoringData(10);

      expect(mockMetricCalculator.calculateSystemMetric).toHaveBeenCalledWith(10);
      expect(mockEventStore.getAlerts).toHaveBeenCalledWith(10);
      expect(mockEventStore.getMessageFlow).toHaveBeenCalledWith(10);
      expect(mockMessageTracker.getStats).toHaveBeenCalled();

      expect(mockIo.emit).toHaveBeenCalledWith(
        'monitoring_dashboard_update',
        expect.objectContaining({
          metrics: expect.any(Object),
          alerts: expect.any(Array),
          recentMessages: expect.any(Array),
          deliveryStats: expect.any(Object),
        })
      );
    });
  });

  describe('sendToSocket', () => {
    it('should emit to a specific socket', () => {
      const socket = { emit: jest.fn() } as any;
      const payload = { msg: 'hello' };
      distributor.sendToSocket(socket, 'direct_event', payload);

      expect(socket.emit).toHaveBeenCalledWith('direct_event', payload);
    });
  });

  describe('sendTrackedMessage', () => {
    it('should create an envelope with tracking metadata and broadcast', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.12345);

      const envelope = distributor.sendTrackedMessage('msg_event', { text: 'hello' }, 'main');

      expect(mockMessageTracker.getNextSequence).toHaveBeenCalledWith('main');
      expect(mockMessageTracker.trackMessage).toHaveBeenCalledWith(envelope);
      expect(mockIo.emit).toHaveBeenCalledWith('msg_event', envelope);
      expect((envelope as any).deliveryStatus).toBe(DeliveryStatus.SENT);

      jest.restoreAllMocks();
    });

    it('should use default channel when not specified', () => {
      const envelope = distributor.sendTrackedMessage('evt', {});
      expect(mockMessageTracker.getNextSequence).toHaveBeenCalledWith('default');
    });
  });
});
